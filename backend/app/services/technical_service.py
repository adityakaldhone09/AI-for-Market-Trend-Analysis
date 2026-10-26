from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError
from app.schemas.technical import (
    IndicatorValues,
    RegimeClassification,
    ReturnMetrics,
    SupportResistanceLevels,
    TechnicalAnalysisResponse,
    TechnicalObservation,
)


class TechnicalService:
    """Computes technical indicators, support/resistance heuristics, and market regime detection."""

    def __init__(self):
        self.loader = CSVDataLoader()

    def calculate_technical_analysis(
        self,
        symbol: Optional[str] = None,
        dataset_name: Optional[str] = None,
        interval: str = "1d",
    ) -> TechnicalAnalysisResponse:
        target_name = symbol or dataset_name or settings.DEFAULT_DATASET
        df, meta = self.loader.load_dataset(target_name)

        if df.empty or len(df) < 5:
            raise DataIngestionError(f"Insufficient historical data for symbol '{target_name}'.")

        df = df.sort_values(by="timestamp").reset_index(drop=True)

        close = df["close"].values
        high = df["high"].values if "high" in df.columns else close
        low = df["low"].values if "low" in df.columns else close
        open_ = df["open"].values if "open" in df.columns else close
        n = len(df)

        close_series = pd.Series(close)

        # 1. Moving Averages
        sma_20 = close_series.rolling(20, min_periods=20).mean()
        sma_50 = close_series.rolling(50, min_periods=50).mean()
        sma_200 = close_series.rolling(200, min_periods=200).mean()

        ema_12 = close_series.ewm(span=12, adjust=False).mean()
        ema_26 = close_series.ewm(span=26, adjust=False).mean()

        # 2. MACD
        macd_line = ema_12 - ema_26
        macd_signal = macd_line.ewm(span=9, adjust=False).mean()
        macd_hist = macd_line - macd_signal

        # 3. RSI 14 (Wilder's formulation)
        delta = close_series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(com=13, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(com=13, min_periods=14, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi_14 = 100 - (100 / (1 + rs))

        # 4. Bollinger Bands (20, 2)
        bb_middle = sma_20
        bb_std = close_series.rolling(20, min_periods=20).std()
        bb_upper = bb_middle + (2.0 * bb_std)
        bb_lower = bb_middle - (2.0 * bb_std)
        bb_bandwidth = ((bb_upper - bb_lower) / bb_middle.replace(0, np.nan)) * 100

        # 5. ATR 14
        tr1 = pd.Series(high) - pd.Series(low)
        tr2 = (pd.Series(high) - pd.Series(close).shift(1)).abs()
        tr3 = (pd.Series(low) - pd.Series(close).shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_14 = tr.rolling(14, min_periods=14).mean()

        # 6. Rolling Annualized Volatility (21 days)
        log_ret = np.log(close_series / close_series.shift(1))
        rolling_vol = log_ret.rolling(21, min_periods=10).std() * np.sqrt(252) * 100

        # Latest values
        cur_close = float(close[-1])
        cur_open = float(open_[-1]) if len(open_) else None
        cur_high = float(high[-1]) if len(high) else None
        cur_low = float(low[-1]) if len(low) else None
        cur_ts = df["timestamp"].iloc[-1]
        ts_str = cur_ts.strftime("%Y-%m-%d") if isinstance(cur_ts, pd.Timestamp) else str(cur_ts)[:10]

        # Returns
        ret_1d = round(float((close[-1] - close[-2]) / close[-2] * 100), 2) if n >= 2 else None
        ret_1w = round(float((close[-1] - close[-6]) / close[-6] * 100), 2) if n >= 6 else None
        ret_1m = round(float((close[-1] - close[-22]) / close[-22] * 100), 2) if n >= 22 else None

        # YTD Return
        current_year = cur_ts.year if isinstance(cur_ts, pd.Timestamp) else int(ts_str[:4])
        df_year = df[pd.to_datetime(df["timestamp"]).dt.year == current_year]
        if not df_year.empty:
            ytd_open = float(df_year["close"].iloc[0])
            ret_ytd = round(float((cur_close - ytd_open) / ytd_open * 100), 2)
        else:
            ret_ytd = None

        returns = ReturnMetrics(
            daily_return_pct=ret_1d,
            weekly_return_pct=ret_1w,
            monthly_return_pct=ret_1m,
            ytd_return_pct=ret_ytd,
        )

        # Support & Resistance (Standard Pivot Points based on previous session H, L, C)
        prev_h = float(high[-2]) if n >= 2 else float(high[-1])
        prev_l = float(low[-2]) if n >= 2 else float(low[-1])
        prev_c = float(close[-2]) if n >= 2 else float(close[-1])
        pivot = (prev_h + prev_l + prev_c) / 3.0

        r1 = round(2 * pivot - prev_l, 2)
        s1 = round(2 * pivot - prev_h, 2)
        r2 = round(pivot + (prev_h - prev_l), 2)
        s2 = round(pivot - (prev_h - prev_l), 2)
        r3 = round(prev_h + 2 * (pivot - prev_l), 2)
        s3 = round(prev_l - 2 * (prev_h - pivot), 2)

        lookback_swing = min(n, 60)
        recent_swing_high = round(float(np.max(high[-lookback_swing:])), 2)
        recent_swing_low = round(float(np.min(low[-lookback_swing:])), 2)

        support_res = SupportResistanceLevels(
            pivot_point=round(pivot, 2),
            r1=r1,
            r2=r2,
            r3=r3,
            s1=s1,
            s2=s2,
            s3=s3,
            recent_swing_high=recent_swing_high,
            recent_swing_low=recent_swing_low,
        )

        # Latest Indicator values
        val_sma20 = round(float(sma_20.iloc[-1]), 2) if pd.notna(sma_20.iloc[-1]) else None
        val_sma50 = round(float(sma_50.iloc[-1]), 2) if pd.notna(sma_50.iloc[-1]) else None
        val_sma200 = round(float(sma_200.iloc[-1]), 2) if pd.notna(sma_200.iloc[-1]) else None
        val_ema12 = round(float(ema_12.iloc[-1]), 2) if pd.notna(ema_12.iloc[-1]) else None
        val_ema26 = round(float(ema_26.iloc[-1]), 2) if pd.notna(ema_26.iloc[-1]) else None
        val_rsi = round(float(rsi_14.iloc[-1]), 2) if pd.notna(rsi_14.iloc[-1]) else None
        val_macd = round(float(macd_line.iloc[-1]), 2) if pd.notna(macd_line.iloc[-1]) else None
        val_signal = round(float(macd_signal.iloc[-1]), 2) if pd.notna(macd_signal.iloc[-1]) else None
        val_hist = round(float(macd_hist.iloc[-1]), 2) if pd.notna(macd_hist.iloc[-1]) else None
        val_bb_upper = round(float(bb_upper.iloc[-1]), 2) if pd.notna(bb_upper.iloc[-1]) else None
        val_bb_mid = round(float(bb_middle.iloc[-1]), 2) if pd.notna(bb_middle.iloc[-1]) else None
        val_bb_lower = round(float(bb_lower.iloc[-1]), 2) if pd.notna(bb_lower.iloc[-1]) else None
        val_bb_bw = round(float(bb_bandwidth.iloc[-1]), 2) if pd.notna(bb_bandwidth.iloc[-1]) else None
        val_atr = round(float(atr_14.iloc[-1]), 2) if pd.notna(atr_14.iloc[-1]) else None
        val_vol = round(float(rolling_vol.iloc[-1]), 2) if pd.notna(rolling_vol.iloc[-1]) else None

        indicators = IndicatorValues(
            sma_20=val_sma20,
            sma_50=val_sma50,
            sma_200=val_sma200,
            ema_12=val_ema12,
            ema_26=val_ema26,
            rsi_14=val_rsi,
            macd_line=val_macd,
            macd_signal=val_signal,
            macd_histogram=val_hist,
            bollinger_upper=val_bb_upper,
            bollinger_middle=val_bb_mid,
            bollinger_lower=val_bb_lower,
            bollinger_bandwidth=val_bb_bw,
            atr_14=val_atr,
            rolling_volatility_annualized=val_vol,
        )

        # 7. Regime Detection
        regime, label, confidence, rationale, is_golden, is_death, price_vs_200, vol_state = (
            self._classify_regime(
                close=cur_close,
                sma50=val_sma50,
                sma200=val_sma200,
                sma20=val_sma20,
                rsi=val_rsi,
                macd_hist=val_hist,
                rolling_vol=val_vol,
                n_bars=n,
            )
        )

        regime_classification = RegimeClassification(
            regime=regime,
            label=label,
            confidence=confidence,
            rationale=rationale,
            is_golden_cross=is_golden,
            is_death_cross=is_death,
            price_vs_sma200=price_vs_200,
            volatility_state=vol_state,
        )

        # Observations for chart rendering (last 120 bars)
        slice_len = min(n, 120)
        recent_df = df.iloc[-slice_len:].copy().reset_index(drop=True)
        obs_list = []
        for i, row in recent_df.iterrows():
            orig_idx = n - slice_len + i
            obs_ts = row["timestamp"]
            obs_ts_str = obs_ts.strftime("%Y-%m-%d") if isinstance(obs_ts, pd.Timestamp) else str(obs_ts)[:10]

            obs_list.append(
                TechnicalObservation(
                    timestamp=obs_ts_str,
                    open=round(float(row["open"]), 2) if "open" in row and pd.notna(row["open"]) else None,
                    high=round(float(row["high"]), 2) if "high" in row and pd.notna(row["high"]) else None,
                    low=round(float(row["low"]), 2) if "low" in row and pd.notna(row["low"]) else None,
                    close=round(float(row["close"]), 2),
                    volume=float(row["volume"]) if "volume" in row and pd.notna(row["volume"]) else None,
                    sma_20=round(float(sma_20.iloc[orig_idx]), 2) if pd.notna(sma_20.iloc[orig_idx]) else None,
                    sma_50=round(float(sma_50.iloc[orig_idx]), 2) if pd.notna(sma_50.iloc[orig_idx]) else None,
                    sma_200=round(float(sma_200.iloc[orig_idx]), 2) if pd.notna(sma_200.iloc[orig_idx]) else None,
                    rsi_14=round(float(rsi_14.iloc[orig_idx]), 2) if pd.notna(rsi_14.iloc[orig_idx]) else None,
                    macd=round(float(macd_line.iloc[orig_idx]), 2) if pd.notna(macd_line.iloc[orig_idx]) else None,
                    macd_signal=round(float(macd_signal.iloc[orig_idx]), 2) if pd.notna(macd_signal.iloc[orig_idx]) else None,
                    macd_hist=round(float(macd_hist.iloc[orig_idx]), 2) if pd.notna(macd_hist.iloc[orig_idx]) else None,
                    bollinger_upper=round(float(bb_upper.iloc[orig_idx]), 2) if pd.notna(bb_upper.iloc[orig_idx]) else None,
                    bollinger_lower=round(float(bb_lower.iloc[orig_idx]), 2) if pd.notna(bb_lower.iloc[orig_idx]) else None,
                )
            )

        staleness = self._determine_staleness(ts_str)

        return TechnicalAnalysisResponse(
            symbol=meta.get("symbol", target_name.upper().replace(".CSV", "")),
            name=meta.get("name", "NIFTY 50 Benchmark Index"),
            instrument_type="index" if "index" in meta.get("name", "").lower() or "nifty" in target_name.lower() else "equity",
            exchange=meta.get("exchange", "NSE"),
            currency=meta.get("currency", "INR"),
            frequency=meta.get("timeframe", "1d"),
            time_zone=meta.get("time_zone", "Asia/Kolkata"),
            latest_timestamp=ts_str,
            latest_close=cur_close,
            latest_open=cur_open,
            latest_high=cur_high,
            latest_low=cur_low,
            volume_note="Traded share volume is not applicable for calculated benchmark indices.",
            data_source=meta.get("source", "NSE / Nifty Indices Historical Records"),
            dataset_provenance=meta,
            staleness_state=staleness,
            returns=returns,
            indicators=indicators,
            support_resistance=support_res,
            regime=regime_classification,
            observations=obs_list,
        )

    def _classify_regime(
        self,
        close: float,
        sma50: Optional[float],
        sma200: Optional[float],
        sma20: Optional[float],
        rsi: Optional[float],
        macd_hist: Optional[float],
        rolling_vol: Optional[float],
        n_bars: int,
    ):
        if n_bars < 50 or sma50 is None:
            return (
                "insufficient-data",
                "Insufficient Historical Data",
                0.2,
                ["Less than 50 trading sessions available; regime detection requires deeper history."],
                False,
                False,
                None,
                "moderate",
            )

        rationale = []
        is_golden = False
        is_death = False
        price_vs_200 = None

        # Volatility state
        vol = rolling_vol or 15.0
        if vol > 25.0:
            vol_state = "extreme"
            rationale.append(f"Elevated annualized volatility ({vol:.1f}%).")
        elif vol > 18.0:
            vol_state = "elevated"
            rationale.append(f"Above-average market volatility ({vol:.1f}%).")
        elif vol < 12.0:
            vol_state = "low"
            rationale.append(f"Subdued volatility environment ({vol:.1f}%).")
        else:
            vol_state = "moderate"

        if sma200 is not None:
            if close > sma200 * 1.01:
                price_vs_200 = "above"
                rationale.append(f"Price is trading above 200-day SMA ({sma200:,.1f}).")
            elif close < sma200 * 0.99:
                price_vs_200 = "below"
                rationale.append(f"Price is trading below 200-day SMA ({sma200:,.1f}).")
            else:
                price_vs_200 = "near"
                rationale.append(f"Price is testing long-term 200-day SMA equilibrium ({sma200:,.1f}).")

            if sma50 > sma200:
                is_golden = True
            elif sma50 < sma200:
                is_death = True

        # Determine regime
        if vol_state == "extreme":
            regime = "high-volatility"
            label = "High Volatility / Turbulence"
            conf = 0.85
        elif sma200 is not None and close > sma50 and sma50 > sma200:
            regime = "uptrend"
            label = "Confirmed Bullish Trend"
            conf = 0.80
            rationale.append("Moving average alignment confirms bullish momentum (Price > SMA50 > SMA200).")
            if rsi and rsi > 60:
                rationale.append(f"RSI indicates positive buying pressure ({rsi:.1f}).")
        elif sma200 is not None and close < sma50 and sma50 < sma200:
            regime = "downtrend"
            label = "Confirmed Bearish Trend"
            conf = 0.80
            rationale.append("Moving average breakdown confirms bearish pressure (Price < SMA50 < SMA200).")
            if rsi and rsi < 40:
                rationale.append(f"RSI indicates oversold momentum ({rsi:.1f}).")
        elif sma20 is not None and abs(close - sma20) / sma20 < 0.015:
            regime = "sideways"
            label = "Range-Bound / Consolidation"
            conf = 0.70
            rationale.append("Price is oscillating within a narrow consolidation band near short-term moving average.")
        elif close > sma50:
            regime = "uptrend"
            label = "Developing Bullish Bias"
            conf = 0.65
            rationale.append("Trading above 50-day moving average.")
        else:
            regime = "sideways"
            label = "Neutral / Transitioning"
            conf = 0.60
            rationale.append("Mixed technical signals across short and long-term moving averages.")

        return regime, label, conf, rationale, is_golden, is_death, price_vs_200, vol_state

    def _determine_staleness(self, latest_date_str: str) -> str:
        try:
            latest_dt = datetime.strptime(latest_date_str, "%Y-%m-%d").date()
            today = datetime.now(timezone.utc).date()
            diff_days = (today - latest_dt).days
            if diff_days <= 1:
                return "fresh"
            elif diff_days <= 3:
                return "market_closed"  # Weekend or recent holiday
            return "historical"
        except Exception:
            return "historical"


technical_service = TechnicalService()
