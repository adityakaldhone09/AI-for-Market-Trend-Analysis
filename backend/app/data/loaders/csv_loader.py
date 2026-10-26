from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from app.core.config import settings
from app.core.logging import logger


class DataIngestionError(Exception):
    """Raised when data ingestion or validation fails."""
    pass


class CSVDataLoader:
    """Safe CSV loader with path isolation, schema validation, and chronological sorting."""

    TIMESTAMP_CANDIDATES = ["timestamp", "date", "datetime", "time", "Date", "Timestamp", "DateTime"]
    TARGET_CANDIDATES = ["close", "Close", "target_value", "target", "price", "Price", "value"]

    def __init__(self, base_datasets_dir: Optional[Path] = None):
        self.base_dir = (base_datasets_dir or settings.datasets_path).resolve()

    def resolve_safe_path(self, filename: str) -> Path:
        """Resolves file path while strictly preventing directory traversal."""
        if not filename:
            raise DataIngestionError("Dataset filename cannot be empty.")

        # Reject path separators to prevent escaping
        if ".." in filename or filename.startswith("/") or "\\" in filename:
            raise DataIngestionError("Invalid dataset filename. Path traversal is not permitted.")

        normalized_key = filename.strip().upper().replace(" ", "").replace("^", "")
        symbol_map = {
            "NIFTY50": "nifty50_daily.csv",
            "NIFTY": "nifty50_daily.csv",
            "NSEI": "nifty50_daily.csv",
            "INDIAVIX": "india_vix_daily.csv",
            "VIX": "india_vix_daily.csv",
            "NIFTYBANK": "nifty_bank_daily.csv",
            "BANKNIFTY": "nifty_bank_daily.csv",
            "NSEBANK": "nifty_bank_daily.csv",
            "NIFTYIT": "nifty_it_daily.csv",
            "CNXIT": "nifty_it_daily.csv",
            "NIFTYAUTO": "nifty_auto_daily.csv",
            "CNXAUTO": "nifty_auto_daily.csv",
            "NIFTYFMCG": "nifty_fmcg_daily.csv",
            "CNXFMCG": "nifty_fmcg_daily.csv",
            "NIFTYPHARMA": "nifty_pharma_daily.csv",
            "CNXPHARMA": "nifty_pharma_daily.csv",
            "CONSTITUENTS": "nifty50_constituents_daily.csv",
            "NIFTY50_CONSTITUENTS": "nifty50_constituents_daily.csv",
        }
        mapped_name = symbol_map.get(normalized_key)

        filename_csv = filename if filename.endswith(".csv") else f"{filename}.csv"
        symbol_pattern = f"{filename.lower()}_stock_daily.csv"
        daily_pattern = f"{filename.lower()}_daily.csv"

        # Check raw, processed, and base directories
        candidate_names = [mapped_name] if mapped_name else []
        candidate_names.extend([filename, filename_csv, symbol_pattern, daily_pattern])
        candidate_paths = []
        for name in candidate_names:
            if not name:
                continue
            candidate_paths.extend([
                self.base_dir / "raw" / name,
                self.base_dir / "processed" / name,
                self.base_dir / name,
            ])

        for p in candidate_paths:
            resolved = p.resolve()
            if self.base_dir in resolved.parents or resolved == self.base_dir:
                if resolved.is_file():
                    return resolved

        raise DataIngestionError(f"Dataset '{filename}' not found in designated dataset directories.")

    def load_dataset(
        self,
        filename: str,
        target_col: Optional[str] = None,
        duplicate_policy: str = "keep_last",
    ) -> Tuple[pd.DataFrame, Dict]:
        """
        Loads, validates, and preprocesses a CSV market dataset.
        
        duplicate_policy: 'keep_last', 'mean', or 'error'
        """
        filepath = self.resolve_safe_path(filename)
        logger.info(f"Loading dataset from: {filepath}")

        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            raise DataIngestionError(f"Failed to read CSV file: {str(e)}")

        if df.empty:
            raise DataIngestionError("Dataset is empty.")

        # Identify timestamp column
        ts_col = None
        for col in self.TIMESTAMP_CANDIDATES:
            if col in df.columns:
                ts_col = col
                break

        if ts_col is None:
            # Try to see if first column is parseable datetime
            try:
                pd.to_datetime(df.iloc[:, 0])
                ts_col = df.columns[0]
            except Exception:
                raise DataIngestionError(
                    f"Required timestamp column missing. Candidates looked for: {self.TIMESTAMP_CANDIDATES}"
                )

        # Standardize timestamp
        try:
            df["timestamp"] = pd.to_datetime(df[ts_col])
        except Exception as e:
            raise DataIngestionError(f"Failed to parse timestamps in column '{ts_col}': {str(e)}")

        # Handle duplicates
        duplicate_count = df["timestamp"].duplicated().sum()
        if duplicate_count > 0:
            logger.warning(
                f"Detected {duplicate_count} duplicate timestamps in {filename}. Applying policy: {duplicate_policy}"
            )
            if duplicate_policy == "error":
                raise DataIngestionError(f"Dataset contains {duplicate_count} duplicate timestamps.")
            elif duplicate_policy == "mean":
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                df = df.groupby("timestamp", as_index=False)[numeric_cols].mean()
            else:  # keep_last
                df = df.drop_duplicates(subset=["timestamp"], keep="last")

        # Sort chronologically
        df = df.sort_values(by="timestamp").reset_index(drop=True)

        # Identify all numeric columns
        numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != "timestamp"]

        # Determine target column
        selected_target = target_col
        if not selected_target:
            for col in self.TARGET_CANDIDATES:
                if col in df.columns:
                    selected_target = col
                    break

        if not selected_target or selected_target not in df.columns:
            if not numeric_cols:
                raise DataIngestionError("No valid numeric target column found in dataset.")
            selected_target = numeric_cols[0]

        # Validate numeric target
        if not pd.api.types.is_numeric_dtype(df[selected_target]):
            try:
                df[selected_target] = pd.to_numeric(df[selected_target], errors="coerce")
            except Exception:
                raise DataIngestionError(f"Target column '{selected_target}' must be numeric.")

        # Ensure canonical target_value column exists for consistent downstream modeling
        df["target_value"] = df[selected_target]

        # Check for companion metadata file
        meta_file = filepath.with_name(f"{filepath.stem}.meta.json")
        companion_meta = {}
        if meta_file.is_file():
            try:
                import json
                with open(meta_file, "r") as f:
                    companion_meta = json.load(f)
            except Exception as e:
                logger.debug(f"Could not read companion meta file {meta_file}: {e}")

        is_synthetic = companion_meta.get(
            "is_synthetic",
            ("synthetic" in filename.lower() or "simulated" in filepath.stem.lower())
        )
        source = companion_meta.get(
            "source",
            ("synthetic_generator" if is_synthetic else "csv_ingestion")
        )

        metadata = {
            "dataset_name": filepath.name,
            "filepath": str(filepath),
            "symbol": companion_meta.get("symbol", filepath.stem.replace("_daily", "").replace("_stock_daily", "").upper()),
            "name": companion_meta.get("name", filepath.stem.replace("_daily", "").replace("_", " ").title()),
            "instrument": companion_meta.get("instrument", companion_meta.get("symbol", filepath.stem.upper())),
            "exchange": companion_meta.get("exchange", "NSE"),
            "currency": companion_meta.get("currency", "INR"),
            "timeframe": companion_meta.get("timeframe", "1d"),
            "time_zone": companion_meta.get("time_zone", "Asia/Kolkata"),
            "source": source,
            "description": companion_meta.get("description", f"Market dataset for {filepath.name}"),
            "is_synthetic": is_synthetic,
            "retrieval_time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "row_count": len(df),
            "date_range": {
                "start_date": df["timestamp"].min().strftime("%Y-%m-%d"),
                "end_date": df["timestamp"].max().strftime("%Y-%m-%d"),
            },
            "columns": list(df.columns),
            "default_target": selected_target,
            "numeric_columns": numeric_cols,
        }

        return df, metadata

    def list_available_datasets(self) -> List[Dict]:
        """Lists all readable CSV datasets in datasets directories."""
        datasets = []
        search_dirs = [self.base_dir / "raw", self.base_dir / "processed", self.base_dir]
        seen_names = set()

        for d in search_dirs:
            if not d.is_dir():
                continue
            for file in sorted(d.glob("*.csv")):
                if file.name in seen_names:
                    continue
                seen_names.add(file.name)
                try:
                    _, meta = self.load_dataset(file.name)
                    datasets.append(meta)
                except Exception as e:
                    logger.debug(f"Could not load metadata for {file.name}: {e}")

        return datasets
