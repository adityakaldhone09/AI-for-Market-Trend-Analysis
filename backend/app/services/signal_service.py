from datetime import datetime, timezone
from typing import List, Optional
import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.schemas.signal import ResearchSignalRequest, ResearchSignalResponse, SignalFactor
from app.services.market_breadth_service import market_breadth_service
from app.services.technical_service import technical_service


class SignalService:
    """Generates transparent, factor-weighted research signals with explicit invalidation levels."""

    def generate_research_signal(self, request: ResearchSignalRequest) -> ResearchSignalResponse:
        sym = request.symbol or settings.PRIMARY_MARKET_SYMBOL

        # 1. Obtain technical analysis & regime
        tech = technical_service.calculate_technical_analysis(symbol=sym)
        close = tech.latest_close
        ind = tech.indicators
        sr = tech.support_resistance

        factors: List[SignalFactor] = []
        score = 0.0  # Range -100 (Extremely Bearish) to +100 (Extremely Bullish)

        # 1. Trend Factor (Weight 30%)
        # Price vs SMA 50 and SMA 200
        if ind.sma_50 and ind.sma_200:
            if close > ind.sma_50 > ind.sma_200:
                score += 30.0
                factors.append(
                    SignalFactor(
                        category="trend",
                        indicator="Moving Average Alignment",
                        reading=f"Close ({close:,.1f}) > SMA50 ({ind.sma_50:,.1f}) > SMA200 ({ind.sma_200:,.1f})",
                        weight=30.0,
                        contribution="bullish",
                        detail="Bullish structural stack across intermediate and long-term moving averages.",
                    )
                )
            elif close < ind.sma_50 < ind.sma_200:
                score -= 30.0
                factors.append(
                    SignalFactor(
                        category="trend",
                        indicator="Moving Average Alignment",
                        reading=f"Close ({close:,.1f}) < SMA50 ({ind.sma_50:,.1f}) < SMA200 ({ind.sma_200:,.1f})",
                        weight=30.0,
                        contribution="bearish",
                        detail="Bearish structural breakdown with price trading beneath intermediate and 200-day averages.",
                    )
                )
            elif close > ind.sma_50:
                score += 15.0
                factors.append(
                    SignalFactor(
                        category="trend",
                        indicator="50-day Moving Average",
                        reading=f"Close ({close:,.1f}) > SMA50 ({ind.sma_50:,.1f})",
                        weight=15.0,
                        contribution="bullish",
                        detail="Price is holding above intermediate 50-day trend support.",
                    )
                )
            else:
                score -= 15.0
                factors.append(
                    SignalFactor(
                        category="trend",
                        indicator="50-day Moving Average",
                        reading=f"Close ({close:,.1f}) < SMA50 ({ind.sma_50:,.1f})",
                        weight=15.0,
                        contribution="bearish",
                        detail="Price is under resistance from 50-day moving average.",
                    )
                )
        else:
            factors.append(
                SignalFactor(
                    category="trend",
                    indicator="Trend Baseline",
                    reading="Limited history",
                    weight=10.0,
                    contribution="neutral",
                    detail="Fewer than 200 sessions available for full trend stack.",
                )
            )

        # 2. Momentum Factor (Weight 25%)
        # RSI 14
        rsi = ind.rsi_14 or 50.0
        if rsi > 60:
            score += 15.0
            factors.append(
                SignalFactor(
                    category="momentum",
                    indicator="RSI (14)",
                    reading=f"{rsi:.1f} (Bullish Expansion)",
                    weight=15.0,
                    contribution="bullish",
                    detail="Positive momentum with RSI maintaining above 60 threshold without extreme exhaustion.",
                )
            )
        elif rsi < 40:
            score -= 15.0
            factors.append(
                SignalFactor(
                    category="momentum",
                    indicator="RSI (14)",
                    reading=f"{rsi:.1f} (Bearish Pressure)",
                    weight=15.0,
                    contribution="bearish",
                    detail="Momentum shows persistent selling pressure with RSI depressed below 40.",
                )
            )
        else:
            factors.append(
                SignalFactor(
                    category="momentum",
                    indicator="RSI (14)",
                    reading=f"{rsi:.1f} (Neutral Equilibrium)",
                    weight=10.0,
                    contribution="neutral",
                    detail="RSI is balanced within the 40-60 equilibrium band.",
                )
            )

        # MACD
        macd_h = ind.macd_histogram or 0.0
        if macd_h > 0:
            score += 10.0
            factors.append(
                SignalFactor(
                    category="momentum",
                    indicator="MACD Histogram",
                    reading=f"+{macd_h:.2f} (Positive Divergence)",
                    weight=10.0,
                    contribution="bullish",
                    detail="MACD line is above signal line indicating positive directional acceleration.",
                )
            )
        elif macd_h < 0:
            score -= 10.0
            factors.append(
                SignalFactor(
                    category="momentum",
                    indicator="MACD Histogram",
                    reading=f"{macd_h:.2f} (Negative Convergence)",
                    weight=10.0,
                    contribution="bearish",
                    detail="MACD line is below signal line showing deceleration.",
                )
            )

        # 3. Volatility Factor (Weight 20%)
        # Bollinger Bands & ATR
        bb_bw = ind.bollinger_bandwidth or 5.0
        atr = ind.atr_14 or (close * 0.01)
        rolling_vol = ind.rolling_volatility_annualized or 14.0

        if rolling_vol > 22.0:
            # High volatility discounts aggressive positions
            score *= 0.8
            factors.append(
                SignalFactor(
                    category="volatility",
                    indicator="Rolling Volatility (Annualized)",
                    reading=f"{rolling_vol:.1f}% (Elevated Risk)",
                    weight=20.0,
                    contribution="neutral",
                    detail="Wide expected range suggests conservative sizing and wider invalidation buffers.",
                )
            )
        else:
            factors.append(
                SignalFactor(
                    category="volatility",
                    indicator="Rolling Volatility (Annualized)",
                    reading=f"{rolling_vol:.1f}% (Normalized)",
                    weight=20.0,
                    contribution="bullish" if score > 0 else "bearish",
                    detail="Stable volatility environment supportive of trend continuation.",
                )
            )

        # 4. Market Breadth Factor (Weight 25%)
        breadth_text = "Neutral breadth"
        try:
            breadth = market_breadth_service.get_market_breadth()
            if breadth.pct_above_sma50 > 60:
                score += 15.0
                breadth_text = f"{breadth.pct_above_sma50:.0f}% constituents above 50 SMA"
                factors.append(
                    SignalFactor(
                        category="market_breadth",
                        indicator="Constituent Breadth (NIFTY 50)",
                        reading=f"{breadth.advances} Adv / {breadth.declines} Dec ({breadth_text})",
                        weight=25.0,
                        contribution="bullish",
                        detail="Broad participation across index constituents confirms positive market internal structure.",
                    )
                )
            elif breadth.pct_above_sma50 < 40:
                score -= 15.0
                breadth_text = f"Only {breadth.pct_above_sma50:.0f}% constituents above 50 SMA"
                factors.append(
                    SignalFactor(
                        category="market_breadth",
                        indicator="Constituent Breadth (NIFTY 50)",
                        reading=f"{breadth.advances} Adv / {breadth.declines} Dec ({breadth_text})",
                        weight=25.0,
                        contribution="bearish",
                        detail="Weak constituent participation indicates narrow leadership and distribution risk.",
                    )
                )
            else:
                factors.append(
                    SignalFactor(
                        category="market_breadth",
                        indicator="Constituent Breadth (NIFTY 50)",
                        reading=f"{breadth.advances} Adv / {breadth.declines} Dec (Balanced)",
                        weight=15.0,
                        contribution="neutral",
                        detail="Mixed constituent participation without clear expansion or liquidation.",
                    )
                )
        except Exception:
            pass

        # Synthesize final signal
        clamped_score = max(-100.0, min(100.0, score))
        confidence = round(50.0 + abs(clamped_score) * 0.4, 1)

        if clamped_score >= 20.0:
            signal_type = "BULLISH_OUTLOOK"
            stance = "LONG_BIAS"
            target_est = round(close * (1.0 + (0.005 * request.horizon_days)), 2)
            invalidation = round(min(sr.s1, close - 1.5 * atr), 2)
            exp_ret = round(((target_est - close) / close) * 100, 2)
            rr = round(abs(target_est - close) / max(abs(close - invalidation), 1.0), 2)
            consensus = "Quantitative consensus leans bullish based on price structure and momentum factors."
        elif clamped_score <= -20.0:
            signal_type = "BEARISH_OUTLOOK"
            stance = "SHORT_BIAS"
            target_est = round(close * (1.0 - (0.005 * request.horizon_days)), 2)
            invalidation = round(max(sr.r1, close + 1.5 * atr), 2)
            exp_ret = round(((target_est - close) / close) * 100, 2)
            rr = round(abs(close - target_est) / max(abs(invalidation - close), 1.0), 2)
            consensus = "Quantitative consensus leans defensive/bearish due to trend breakdown and selling momentum."
        else:
            signal_type = "NEUTRAL_RANGE"
            stance = "FLAT_WAIT"
            target_est = round(close, 2)
            invalidation = round(sr.s2, 2)
            exp_ret = 0.0
            rr = 1.0
            consensus = "Conflicting indicators suggest consolidation. Cash/flat stance recommended until breakout."

        return ResearchSignalResponse(
            symbol=tech.symbol,
            instrument_name=tech.name,
            timestamp=tech.latest_timestamp,
            latest_close=close,
            signal=signal_type,
            stance=stance,
            confidence_pct=confidence,
            horizon=f"Next {request.horizon_days} Trading Sessions",
            target_price_estimate=target_est,
            expected_return_pct=exp_ret,
            invalidation_level=invalidation,
            risk_reward_ratio=rr,
            regime=tech.regime.label,
            primary_factors=factors,
            ml_model_consensus=consensus,
            staleness_state=tech.staleness_state,
        )


signal_service = SignalService()
