from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger


class LLMService:
    """
    Connects to Google Gemini API using GEMINI_API_KEY from .env.
    Generates market narrative executive briefs with robust statistical fallback.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def generate_market_narrative(
        self,
        symbol_or_dataset: str,
        trend_summary: Dict[str, Any],
        forecast_points: List[Dict[str, Any]],
        sentiment_verdict: Optional[str] = "Neutral",
    ) -> Dict[str, Any]:
        """
        Synthesizes an executive market narrative using Gemini LLM if available,
        or algorithmic financial narrative as a reliable fallback.
        """
        # Prepare context data
        start_val = trend_summary.get("start_value", 0.0)
        end_val = trend_summary.get("end_value", 0.0)
        pct_change = trend_summary.get("percentage_change", 0.0)
        volatility = trend_summary.get("volatility", 0.0)
        direction = trend_summary.get("direction", "sideways")
        sma7 = trend_summary.get("sma_7_current")
        sma30 = trend_summary.get("sma_30_current")

        next_preds = [pt.get("predicted_value") for pt in forecast_points[:7] if "predicted_value" in pt]
        forecast_trend = "upward" if (next_preds and next_preds[-1] > end_val) else "downward"

        prompt = (
            f"You are a senior quantitative financial analyst. Provide an executive summary of market trends for {symbol_or_dataset}.\n"
            f"- Historical Movement: {pct_change}% (from {start_val} to {end_val})\n"
            f"- Direction: {direction.upper()}\n"
            f"- Annualized Volatility: {volatility}%\n"
            f"- 7-Day SMA: {sma7}, 30-Day SMA: {sma30}\n"
            f"- Forecasted Trend: {forecast_trend} with 7-day targets {next_preds}\n"
            f"- News Sentiment: {sentiment_verdict}\n\n"
            f"Write a concise 3-paragraph executive brief covering: (1) Technical Price Action, (2) Model Forecast & Outlook, (3) Risk Factors."
        )

        narrative_text = None
        source = "algorithmic_engine"

        # Try Google Gemini if key is provided
        if self.api_key:
            candidate_endpoints = [
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={self.api_key}",
                f"https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key={self.api_key}",
            ]
            for endpoint in candidate_endpoints:
                try:
                    async with httpx.AsyncClient(timeout=4.0) as client:
                        resp = await client.post(
                            endpoint,
                            json={"contents": [{"parts": [{"text": prompt}]}]},
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                text_val = candidates[0].get("content", {}).get("parts", [{}])[0].get("text")
                                if text_val:
                                    narrative_text = text_val
                                    source = "gemini-3.8-flash"
                                    break
                except Exception as e:
                    logger.debug(f"Gemini API call skipped or timed out: {e}")

        # If LLM didn't return (due to network or timeout), generate high-grade algorithmic narrative
        if not narrative_text:
            sentiment_phrase = (
                "aligns with positive media sentiment" if sentiment_verdict == "Bullish"
                else ("echoes negative press sentiment" if sentiment_verdict == "Bearish" else "reflects balanced news coverage")
            )
            sma_relationship = (
                "trading above its 30-day moving average, signaling continued momentum"
                if (sma7 and sma30 and sma7 >= sma30)
                else "trading below its intermediate moving averages, signaling consolidation or caution"
            )

            narrative_text = (
                f"### Executive Market Brief: {symbol_or_dataset.upper()}\n\n"
                f"**Technical Price Action:** Over the evaluated period, {symbol_or_dataset} experienced a net move of {pct_change:+.2f}%, "
                f"moving from {start_val:.2f} to {end_val:.2f}. The asset exhibits {direction} structural momentum with an annualized volatility "
                f"of {volatility:.2f}%. It is currently {sma_relationship}.\n\n"
                f"**Forecast & Momentum Outlook:** Autoregressive multi-step models project a {forecast_trend} path over the upcoming "
                f"horizon, with near-term expected values around {next_preds[0] if next_preds else end_val:.2f}. Market sentiment currently {sentiment_phrase}.\n\n"
                f"**Risk & Uncertainty Factors:** Given prevailing volatility and confidence interval bounds, traders should monitor support near "
                f"{forecast_points[0].get('lower_bound', start_val) if forecast_points else start_val:.2f}. Projections are derived from numerical statistical models "
                f"and do not constitute investment advice."
            )

        return {
            "symbol_or_dataset": symbol_or_dataset,
            "source": source,
            "sentiment_considered": sentiment_verdict,
            "narrative": narrative_text,
        }


llm_service = LLMService()
