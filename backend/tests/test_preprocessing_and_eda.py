import numpy as np
import pandas as pd
from app.data.preprocessing.cleaner import DataCleaner
from app.services.analysis_service import AnalysisService


def test_cleaner_handles_missing_values():
    cleaner = DataCleaner()
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=6, freq="D"),
        "target_value": [10.0, np.nan, 12.0, np.nan, 15.0, 16.0],
    })

    cleaned_df, audit = cleaner.audit_and_clean(df, target_col="target_value")
    # Verify no missing values remaining
    assert cleaned_df["target_value"].isna().sum() == 0
    # Forward fill verification: index 1 should take 10.0
    assert float(cleaned_df["target_value"].iloc[1]) == 10.0
    # Index 3 should take 12.0
    assert float(cleaned_df["target_value"].iloc[3]) == 12.0
    assert len(audit["actions_taken"]) > 0


def test_outlier_detection_iqr():
    cleaner = DataCleaner()
    # Normal distribution with 2 extreme outliers
    values = [10.0, 10.2, 10.1, 9.9, 10.3, 10.0, 9.8, 10.1, 100.0, -50.0]
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=10, freq="D"),
        "target_value": values,
    })

    summary = cleaner.detect_outliers_iqr(df, "target_value")
    assert summary["outlier_count"] == 2
    assert summary["outlier_percentage"] == 20.0
    assert 8 in summary["outlier_indices"]
    assert 9 in summary["outlier_indices"]


def test_analysis_service_summary():
    analysis = AnalysisService()
    summary = analysis.generate_data_summary("synthetic_market_data.csv")

    assert summary.row_count > 0
    assert summary.target_column in summary.descriptive_statistics
    stats = summary.descriptive_statistics[summary.target_column]
    assert stats.count == summary.row_count
    assert stats.min <= stats.median <= stats.max
    assert summary.trend_summary.direction in ["bullish", "bearish", "sideways"]
    assert len(summary.chart_preview) > 0
