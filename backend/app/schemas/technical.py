from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IndicatorValues(BaseModel):
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None
    rsi_14: Optional[float] = None
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_middle: Optional[float] = None
    bollinger_lower: Optional[float] = None
    bollinger_bandwidth: Optional[float] = None
    atr_14: Optional[float] = None
    rolling_volatility_annualized: Optional[float] = None


class SupportResistanceLevels(BaseModel):
    pivot_point: float
    r1: float
    r2: float
    r3: float
    s1: float
    s2: float
    s3: float
    recent_swing_high: Optional[float] = None
    recent_swing_low: Optional[float] = None


class RegimeClassification(BaseModel):
    regime: str  # "uptrend" | "downtrend" | "sideways" | "high-volatility" | "insufficient-data"
    label: str
    confidence: float  # 0.0 to 1.0
    rationale: List[str]
    is_golden_cross: bool = False
    is_death_cross: bool = False
    price_vs_sma200: Optional[str] = None  # "above" | "below" | "near"
    volatility_state: str  # "low" | "moderate" | "elevated" | "extreme"


class ReturnMetrics(BaseModel):
    daily_return_pct: Optional[float] = None
    weekly_return_pct: Optional[float] = None
    monthly_return_pct: Optional[float] = None
    ytd_return_pct: Optional[float] = None


class TechnicalObservation(BaseModel):
    timestamp: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: float
    volume: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_lower: Optional[float] = None


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    name: str
    instrument_type: str  # "index" | "equity" | "derivative"
    exchange: str = "NSE"
    currency: str = "INR"
    frequency: str = "1d"
    time_zone: str = "Asia/Kolkata"
    latest_timestamp: str
    latest_close: float
    latest_open: Optional[float] = None
    latest_high: Optional[float] = None
    latest_low: Optional[float] = None
    volume_note: str = "Traded share volume is not applicable for calculated benchmark indices."
    data_source: str
    dataset_provenance: Dict[str, Any]
    staleness_state: str  # "fresh" | "market_closed" | "historical"
    returns: ReturnMetrics
    indicators: IndicatorValues
    support_resistance: SupportResistanceLevels
    regime: RegimeClassification
    observations: List[TechnicalObservation] = Field(default_factory=list)
