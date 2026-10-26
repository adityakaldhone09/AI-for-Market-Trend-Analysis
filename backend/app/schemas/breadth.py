from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ConstituentBreadthItem(BaseModel):
    symbol: str
    name: str
    weight: float
    close: float
    change_pct: float
    above_sma_20: bool
    above_sma_50: bool
    above_sma_200: bool
    contribution: float  # weight * change_pct / 100


class MarketBreadthResponse(BaseModel):
    timestamp: str
    total_constituents: int
    advances: int
    declines: int
    unchanged: int
    advance_decline_ratio: float
    pct_above_sma20: float
    pct_above_sma50: float
    pct_above_sma200: float
    top_gainers: List[ConstituentBreadthItem]
    top_losers: List[ConstituentBreadthItem]
    top_contributors: List[ConstituentBreadthItem]
    breadth_signal: str  # "broad_expansion" | "positive_divergence" | "narrow_advance" | "broad_decline"
    data_source: str
    staleness_state: str


class SectorPerformanceItem(BaseModel):
    symbol: str
    name: str
    close: float
    change_1d_pct: float
    change_1w_pct: Optional[float] = None
    change_1m_pct: Optional[float] = None
    relative_strength_vs_nifty_1d: float
    relative_strength_vs_nifty_1m: Optional[float] = None
    outperforming: bool


class VixContext(BaseModel):
    symbol: str = "INDIAVIX"
    name: str = "India VIX"
    current_value: float
    previous_value: float
    change_points: float
    change_pct: float
    regime: str  # "low_complacency" | "normal" | "elevated" | "extreme_fear"
    description: str


class SectorsPerformanceResponse(BaseModel):
    timestamp: str
    benchmark_symbol: str = "NIFTY50"
    benchmark_close: float
    benchmark_return_1d: float
    vix_context: Optional[VixContext] = None
    sectors: List[SectorPerformanceItem] = Field(default_factory=list)
    leading_sector: Optional[str] = None
    lagging_sector: Optional[str] = None
    data_source: str
