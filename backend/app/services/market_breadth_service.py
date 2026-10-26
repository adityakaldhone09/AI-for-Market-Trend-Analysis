from datetime import datetime, timezone
from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError
from app.schemas.breadth import (
    ConstituentBreadthItem,
    MarketBreadthResponse,
    SectorPerformanceItem,
    SectorsPerformanceResponse,
    VixContext,
)


class MarketBreadthService:
    """Computes constituent advance/decline breadth, moving average participation, and sector relative strength."""

    def __init__(self):
        self.loader = CSVDataLoader()

    def get_market_breadth(self) -> MarketBreadthResponse:
        try:
            df, meta = self.loader.load_dataset("nifty50_constituents_daily.csv")
        except Exception as e:
            logger.warning(f"Failed to load constituent daily data: {e}")
            raise DataIngestionError("Constituent daily data is currently unavailable.")

        if df.empty:
            raise DataIngestionError("Constituent dataset is empty.")

        symbols = df["symbol"].unique()
        items: List[ConstituentBreadthItem] = []

        advances = 0
        declines = 0
        unchanged = 0
        above_20_cnt = 0
        above_50_cnt = 0
        above_200_cnt = 0

        latest_ts = df["timestamp"].max()
        ts_str = latest_ts.strftime("%Y-%m-%d") if isinstance(latest_ts, pd.Timestamp) else str(latest_ts)[:10]

        for sym in symbols:
            sub = df[df["symbol"] == sym].sort_values("timestamp").reset_index(drop=True)
            if len(sub) < 2:
                continue

            c_latest = float(sub["close"].iloc[-1])
            c_prev = float(sub["close"].iloc[-2])
            chg_pct = round(((c_latest - c_prev) / c_prev) * 100, 2)

            name = str(sub["name"].iloc[-1]) if "name" in sub.columns else sym
            weight = float(sub["weight"].iloc[-1]) if "weight" in sub.columns else 1.0

            close_series = sub["close"]
            sma_20 = close_series.rolling(20, min_periods=5).mean().iloc[-1]
            sma_50 = close_series.rolling(50, min_periods=10).mean().iloc[-1]
            sma_200 = close_series.rolling(200, min_periods=20).mean().iloc[-1]

            above_20 = bool(pd.notna(sma_20) and c_latest > sma_20)
            above_50 = bool(pd.notna(sma_50) and c_latest > sma_50)
            above_200 = bool(pd.notna(sma_200) and c_latest > sma_200)

            if above_20:
                above_20_cnt += 1
            if above_50:
                above_50_cnt += 1
            if above_200:
                above_200_cnt += 1

            if chg_pct > 0.05:
                advances += 1
            elif chg_pct < -0.05:
                declines += 1
            else:
                unchanged += 1

            contribution = round((weight * chg_pct) / 100.0, 4)

            items.append(
                ConstituentBreadthItem(
                    symbol=sym,
                    name=name,
                    weight=weight,
                    close=c_latest,
                    change_pct=chg_pct,
                    above_sma_20=above_20,
                    above_sma_50=above_50,
                    above_sma_200=above_200,
                    contribution=contribution,
                )
            )

        total = len(items)
        ad_ratio = round(advances / max(declines, 1), 2)
        pct_20 = round((above_20_cnt / max(total, 1)) * 100, 1)
        pct_50 = round((above_50_cnt / max(total, 1)) * 100, 1)
        pct_200 = round((above_200_cnt / max(total, 1)) * 100, 1)

        sorted_by_change = sorted(items, key=lambda x: x.change_pct, reverse=True)
        top_gainers = sorted_by_change[:5]
        top_losers = sorted(items, key=lambda x: x.change_pct)[:5]
        top_contributors = sorted(items, key=lambda x: abs(x.contribution), reverse=True)[:5]

        if advances >= total * 0.7:
            breadth_sig = "broad_expansion"
        elif declines >= total * 0.7:
            breadth_sig = "broad_decline"
        elif advances > declines and pct_50 > 50:
            breadth_sig = "positive_divergence"
        else:
            breadth_sig = "narrow_advance"

        return MarketBreadthResponse(
            timestamp=ts_str,
            total_constituents=total,
            advances=advances,
            declines=declines,
            unchanged=unchanged,
            advance_decline_ratio=ad_ratio,
            pct_above_sma20=pct_20,
            pct_above_sma50=pct_50,
            pct_above_sma200=pct_200,
            top_gainers=top_gainers,
            top_losers=top_losers,
            top_contributors=top_contributors,
            breadth_signal=breadth_sig,
            data_source="NSE / Nifty Indices Official Top Constituents",
            staleness_state="fresh" if (datetime.now(timezone.utc).strftime("%Y-%m-%d") == ts_str) else "historical",
        )

    def get_sectors_performance(self) -> SectorsPerformanceResponse:
        # Load benchmark NIFTY 50
        df_nifty, _ = self.loader.load_dataset("nifty50_daily.csv")
        nifty_close = float(df_nifty["close"].iloc[-1])
        nifty_prev = float(df_nifty["close"].iloc[-2]) if len(df_nifty) >= 2 else nifty_close
        nifty_1d = round(((nifty_close - nifty_prev) / nifty_prev) * 100, 2)
        nifty_1m_ago = float(df_nifty["close"].iloc[-22]) if len(df_nifty) >= 22 else nifty_close
        nifty_1m = round(((nifty_close - nifty_1m_ago) / nifty_1m_ago) * 100, 2)

        latest_ts = df_nifty["timestamp"].max()
        ts_str = latest_ts.strftime("%Y-%m-%d") if isinstance(latest_ts, pd.Timestamp) else str(latest_ts)[:10]

        # Load India VIX
        vix_ctx = None
        try:
            df_vix, _ = self.loader.load_dataset("india_vix_daily.csv")
            if not df_vix.empty and len(df_vix) >= 2:
                v_cur = float(df_vix["close"].iloc[-1])
                v_prev = float(df_vix["close"].iloc[-2])
                v_pts = round(v_cur - v_prev, 2)
                v_pct = round(((v_cur - v_prev) / v_prev) * 100, 2)

                if v_cur < 13.0:
                    v_reg = "low_complacency"
                    v_desc = "Low implied volatility; market participants price in stability."
                elif v_cur <= 18.0:
                    v_reg = "normal"
                    v_desc = "Normal historical volatility range for Indian equities."
                elif v_cur <= 24.0:
                    v_reg = "elevated"
                    v_desc = "Elevated risk perception and option pricing."
                else:
                    v_reg = "extreme_fear"
                    v_desc = "High market turbulence and hedging demand."

                vix_ctx = VixContext(
                    symbol="INDIAVIX",
                    name="India VIX",
                    current_value=round(v_cur, 2),
                    previous_value=round(v_prev, 2),
                    change_points=v_pts,
                    change_pct=v_pct,
                    regime=v_reg,
                    description=v_desc,
                )
        except Exception as e:
            logger.debug(f"Could not load India VIX: {e}")

        # Sector indices
        sectors_info = [
            ("nifty_bank_daily.csv", "NIFTYBANK", "NIFTY Bank"),
            ("nifty_it_daily.csv", "NIFTYIT", "NIFTY IT"),
            ("nifty_auto_daily.csv", "NIFTYAUTO", "NIFTY Auto"),
            ("nifty_fmcg_daily.csv", "NIFTYFMCG", "NIFTY FMCG"),
            ("nifty_pharma_daily.csv", "NIFTYPHARMA", "NIFTY Pharma"),
        ]

        sector_items: List[SectorPerformanceItem] = []
        for fname, sym, sname in sectors_info:
            try:
                sdf, _ = self.loader.load_dataset(fname)
                if len(sdf) < 2:
                    continue
                s_cur = float(sdf["close"].iloc[-1])
                s_prev = float(sdf["close"].iloc[-2])
                s_1w_ago = float(sdf["close"].iloc[-6]) if len(sdf) >= 6 else s_prev
                s_1m_ago = float(sdf["close"].iloc[-22]) if len(sdf) >= 22 else s_prev

                chg_1d = round(((s_cur - s_prev) / s_prev) * 100, 2)
                chg_1w = round(((s_cur - s_1w_ago) / s_1w_ago) * 100, 2)
                chg_1m = round(((s_cur - s_1m_ago) / s_1m_ago) * 100, 2)

                rel_1d = round(chg_1d - nifty_1d, 2)
                rel_1m = round(chg_1m - nifty_1m, 2)

                sector_items.append(
                    SectorPerformanceItem(
                        symbol=sym,
                        name=sname,
                        close=round(s_cur, 2),
                        change_1d_pct=chg_1d,
                        change_1w_pct=chg_1w,
                        change_1m_pct=chg_1m,
                        relative_strength_vs_nifty_1d=rel_1d,
                        relative_strength_vs_nifty_1m=rel_1m,
                        outperforming=bool(rel_1d > 0),
                    )
                )
            except Exception as e:
                logger.debug(f"Could not load sector {fname}: {e}")

        # Leading & lagging
        leading = max(sector_items, key=lambda x: x.change_1d_pct).name if sector_items else None
        lagging = min(sector_items, key=lambda x: x.change_1d_pct).name if sector_items else None

        return SectorsPerformanceResponse(
            timestamp=ts_str,
            benchmark_symbol="NIFTY50",
            benchmark_close=nifty_close,
            benchmark_return_1d=nifty_1d,
            vix_context=vix_ctx,
            sectors=sector_items,
            leading_sector=leading,
            lagging_sector=lagging,
            data_source="NSE / Nifty Sector Indices Official Historical Records",
        )


market_breadth_service = MarketBreadthService()
