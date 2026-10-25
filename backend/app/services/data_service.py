from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError
from app.data.loaders.synthetic_generator import ensure_default_datasets
from app.schemas.market import MarketDataPoint, MarketDataResponse, MarketDatasetMetadata


class DataService:
    """Service for dataset cataloging, ingestion, and querying."""

    def __init__(self):
        self.loader = CSVDataLoader()
        # Ensure default synthetic dataset is initialized
        ensure_default_datasets()

    def get_available_datasets(self) -> List[MarketDatasetMetadata]:
        """Returns catalog of all available market datasets."""
        raw_meta_list = self.loader.list_available_datasets()
        results = []
        for meta in raw_meta_list:
            results.append(
                MarketDatasetMetadata(
                    dataset_name=meta["dataset_name"],
                    source=meta["source"],
                    is_synthetic=meta["is_synthetic"],
                    retrieval_time=meta["retrieval_time"],
                    row_count=meta["row_count"],
                    date_range=meta["date_range"],
                    columns=meta["columns"],
                    default_target=meta["default_target"],
                    numeric_columns=meta["numeric_columns"],
                )
            )
        return results

    def get_market_data(
        self,
        dataset_name: Optional[str] = None,
        target_col: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 100,
    ) -> MarketDataResponse:
        """Retrieves filtered, paginated market data in chronological order."""
        target_dataset = dataset_name or settings.DEFAULT_DATASET
        df, meta = self.loader.load_dataset(target_dataset, target_col=target_col)
        selected_target = meta["default_target"]

        # Date filtering
        if start_date:
            try:
                start_dt = pd.to_datetime(start_date)
                df = df[df["timestamp"] >= start_dt]
            except Exception as e:
                raise DataIngestionError(f"Invalid start_date '{start_date}': {e}")

        if end_date:
            try:
                end_dt = pd.to_datetime(end_date)
                df = df[df["timestamp"] <= end_dt]
            except Exception as e:
                raise DataIngestionError(f"Invalid end_date '{end_date}': {e}")

        df = df.sort_values(by="timestamp").reset_index(drop=True)
        total_records = len(df)
        total_pages = max(1, int(np.ceil(total_records / page_size)))
        page = max(1, min(page, total_pages))

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = df.iloc[start_idx:end_idx]

        data_points = []
        for _, row in sliced.iterrows():
            ts_str = row["timestamp"].strftime("%Y-%m-%d") if isinstance(row["timestamp"], pd.Timestamp) else str(row["timestamp"])
            dp = MarketDataPoint(
                timestamp=ts_str,
                target_value=float(row["target_value"]),
                open=float(row["open"]) if "open" in row and pd.notna(row["open"]) else None,
                high=float(row["high"]) if "high" in row and pd.notna(row["high"]) else None,
                low=float(row["low"]) if "low" in row and pd.notna(row["low"]) else None,
                close=float(row["close"]) if "close" in row and pd.notna(row["close"]) else None,
                volume=float(row["volume"]) if "volume" in row and pd.notna(row["volume"]) else None,
                units_sold=float(row["units_sold"]) if "units_sold" in row and pd.notna(row["units_sold"]) else None,
                product_price=float(row["product_price"]) if "product_price" in row and pd.notna(row["product_price"]) else None,
            )
            data_points.append(dp)

        return MarketDataResponse(
            dataset_name=target_dataset,
            target_col=selected_target,
            total_records=total_records,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            data=data_points,
        )


data_service = DataService()
