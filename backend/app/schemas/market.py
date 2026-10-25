from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DateRange(BaseModel):
    start_date: str
    end_date: str


class MarketDatasetMetadata(BaseModel):
    dataset_name: str
    symbol: Optional[str] = None
    name: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    source: str
    is_synthetic: bool = False
    retrieval_time: str
    row_count: int
    date_range: DateRange
    columns: List[str]
    default_target: str
    numeric_columns: List[str]


class MarketDataPoint(BaseModel):
    timestamp: str
    target_value: Optional[float] = None
    value: Optional[float] = None
    target: Optional[float] = None
    price: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None
    units_sold: Optional[float] = None
    product_price: Optional[float] = None
    additional_features: Optional[Dict[str, Any]] = None


class MarketDataResponse(BaseModel):
    dataset_name: str
    dataset: Optional[str] = None
    symbol: Optional[str] = None
    target_col: str
    target: Optional[str] = None
    total_records: int
    page: int
    page_size: int
    total_pages: int
    data: List[MarketDataPoint] = Field(default_factory=list)


class MarketListResponse(BaseModel):
    total_datasets: int
    datasets: List[MarketDatasetMetadata] = Field(default_factory=list)
    markets: List[MarketDatasetMetadata] = Field(default_factory=list)
