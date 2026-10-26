from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SignalFactor(BaseModel):
    category: str  # "trend" | "momentum" | "volatility" | "ml_forecast" | "market_breadth"
    indicator: str
    reading: str
    weight: float
    contribution: str  # "bullish" | "bearish" | "neutral"
    detail: str


class ResearchSignalRequest(BaseModel):
    symbol: Optional[str] = "NIFTY50"
    horizon_days: int = Field(5, ge=1, le=10, description="Forecast and signal horizon in trading sessions (1 to 10)")
    risk_tolerance: Optional[str] = Field("balanced", description="'conservative', 'balanced', 'aggressive'")


class ResearchSignalResponse(BaseModel):
    symbol: str
    instrument_name: str
    timestamp: str
    latest_close: float
    signal: str  # "BULLISH_OUTLOOK" | "BEARISH_OUTLOOK" | "NEUTRAL_RANGE"
    stance: str  # "LONG_BIAS" | "SHORT_BIAS" | "FLAT_WAIT"
    confidence_pct: float  # e.g. 72.5%
    horizon: str  # e.g. "1-5 Sessions"
    target_price_estimate: Optional[float] = None
    expected_return_pct: Optional[float] = None
    invalidation_level: float  # Key stop/invalidation level
    risk_reward_ratio: Optional[float] = None
    regime: str
    primary_factors: List[SignalFactor]
    ml_model_consensus: str
    staleness_state: str
    disclaimer: str = (
        "Educational and quantitative research signal for informational decision support only. "
        "Does not constitute personalized financial advice or research recommendations under SEBI (Research Analysts) "
        "or SEBI (Investment Advisers) Regulations. No returns or profit guarantees are implied."
    )
