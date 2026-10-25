from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from app.core.logging import logger


class DataCleaner:
    """Preprocesses raw time-series data while tracking cleaning audits and avoiding data leakage."""

    @staticmethod
    def audit_and_clean(
        df: pd.DataFrame,
        target_col: str = "target_value",
        interpolate_missing: bool = True,
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Cleans missing values while auditing all actions taken.
        Only backward information is allowed for filling (e.g. ffill or strictly causal interpolation).
        """
        cleaned_df = df.copy()
        audit_log: Dict[str, Any] = {
            "initial_rows": len(df),
            "missing_values_detected": {},
            "actions_taken": [],
            "outliers_flagged": 0,
        }

        # Check missing values per column
        for col in cleaned_df.columns:
            missing_count = int(cleaned_df[col].isna().sum())
            if missing_count > 0:
                audit_log["missing_values_detected"][col] = {
                    "count": missing_count,
                    "percentage": round((missing_count / len(cleaned_df)) * 100, 2),
                }

        # Handling missing values in target
        if target_col in cleaned_df.columns and cleaned_df[target_col].isna().sum() > 0:
            if interpolate_missing:
                # Forward-fill to avoid lookahead leakage, then backfill initial rows if needed
                cleaned_df[target_col] = cleaned_df[target_col].ffill().bfill()
                audit_log["actions_taken"].append(
                    f"Forward-filled {audit_log['missing_values_detected'].get(target_col, {}).get('count', 0)} missing values in target '{target_col}'"
                )
            else:
                initial_count = len(cleaned_df)
                cleaned_df = cleaned_df.dropna(subset=[target_col]).reset_index(drop=True)
                audit_log["actions_taken"].append(
                    f"Dropped {initial_count - len(cleaned_df)} rows with missing target values"
                )

        # Detect outliers in target column using IQR
        outlier_info = DataCleaner.detect_outliers_iqr(cleaned_df, target_col)
        audit_log["outliers_flagged"] = outlier_info["outlier_count"]
        audit_log["outlier_summary"] = outlier_info
        audit_log["final_rows"] = len(cleaned_df)

        return cleaned_df, audit_log

    @staticmethod
    def detect_outliers_iqr(df: pd.DataFrame, col: str, multiplier: float = 1.5) -> Dict[str, Any]:
        """
        Detects outliers using the Interquartile Range (IQR) rule.
        Does NOT remove them; purely flags for analysis as sudden market moves may be valid events.
        """
        if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
            return {
                "column": col,
                "method": f"IQR ({multiplier}x)",
                "outlier_count": 0,
                "outlier_percentage": 0.0,
                "lower_bound": 0.0,
                "upper_bound": 0.0,
                "outlier_indices": [],
            }

        series = df[col].dropna()
        q1 = float(series.quantile(0.25))
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1

        lower_bound = q1 - multiplier * iqr
        upper_bound = q3 + multiplier * iqr

        outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
        outlier_indices = df.index[outlier_mask].tolist()
        outlier_count = len(outlier_indices)
        percentage = round((outlier_count / len(df)) * 100, 2) if len(df) > 0 else 0.0

        return {
            "column": col,
            "method": f"IQR ({multiplier}x)",
            "outlier_count": outlier_count,
            "outlier_percentage": percentage,
            "lower_bound": round(lower_bound, 4),
            "upper_bound": round(upper_bound, 4),
            "outlier_indices": outlier_indices[:100],  # cap indices to avoid huge payloads
        }
