from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.market import DateRange


class DescriptiveStats(BaseModel):
    count: int
    mean: float
    std: float
    min: float
    p25: float
    median: float
    p75: float
    max: float
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None


class MissingValueSummary(BaseModel):
    column: str
    missing_count: int
    missing_percentage: float


class OutlierSummary(BaseModel):
    column: str
    method: str = "IQR (1.5x)"
    outlier_count: int
    outlier_percentage: float
    lower_bound: float
    upper_bound: float
    outlier_indices: List[int] = []


class TrendSummary(BaseModel):
    target_column: str
    start_value: float
    end_value: float
    net_change: float
    percentage_change: float
    direction: str  # "bullish", "bearish", "sideways"
    volatility: float  # annualized or standard deviation of daily returns
    sma_7_current: Optional[float] = None
    sma_30_current: Optional[float] = None


class ChartDataPoint(BaseModel):
    timestamp: str
    value: float
    sma_7: Optional[float] = None
    sma_30: Optional[float] = None
    is_outlier: bool = False


class DataSummaryResponse(BaseModel):
    dataset_name: str
    dataset: Optional[str] = None
    symbol: Optional[str] = None
    source: str
    is_synthetic: bool
    row_count: int
    date_range: DateRange
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    columns: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    target_column: str
    target: Optional[str] = None
    missing_values: Any = 0
    descriptive_statistics: Dict[str, DescriptiveStats] = Field(default_factory=dict)
    outliers: OutlierSummary
    trend_summary: TrendSummary
    chart_preview: List[ChartDataPoint] = Field(default_factory=list)
    mean: Optional[float] = None
    median: Optional[float] = None
    standard_deviation: Optional[float] = None
    latest_value: Optional[float] = None
    previous_value: Optional[float] = None
    data_is_synthetic: Optional[bool] = None
    datasetName: Optional[str] = None
    rowCount: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    missingValues: Optional[Dict[str, int]] = None
    statistics: Optional[Dict[str, Dict[str, Optional[float]]]] = None
