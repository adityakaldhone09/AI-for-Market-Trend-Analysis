from typing import Any, Dict, Optional, Tuple
import pandas as pd
from app.data.loaders.csv_loader import CSVDataLoader
from app.data.preprocessing.cleaner import DataCleaner


class PreprocessingService:
    """Service orchestrating dataset cleaning and validation."""

    def __init__(self):
        self.loader = CSVDataLoader()
        self.cleaner = DataCleaner()

    def get_cleaned_data(
        self,
        dataset_name: str,
        target_col: Optional[str] = None,
        interpolate_missing: bool = True,
    ) -> Tuple[pd.DataFrame, Dict[str, Any], Dict[str, Any]]:
        """Loads dataset and runs safe cleaning pipeline."""
        df, meta = self.loader.load_dataset(dataset_name, target_col=target_col)
        selected_target = meta["default_target"]
        cleaned_df, audit = self.cleaner.audit_and_clean(
            df, target_col=selected_target, interpolate_missing=interpolate_missing
        )
        return cleaned_df, meta, audit


preprocessing_service = PreprocessingService()
