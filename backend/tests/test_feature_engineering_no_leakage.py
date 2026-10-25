import numpy as np
import pandas as pd
import pytest
from app.ml.features import chronological_train_test_split, create_time_series_features


def test_chronological_train_test_split(sample_clean_df):
    train_df, test_df = chronological_train_test_split(sample_clean_df, test_ratio=0.2)
    assert len(train_df) == 80
    assert len(test_df) == 20

    # Ensure temporal boundary: max train timestamp < min test timestamp
    assert train_df["timestamp"].max() < test_df["timestamp"].min()

    # Ensure no shuffling: indices must remain strictly monotonic
    assert train_df["timestamp"].is_monotonic_increasing
    assert test_df["timestamp"].is_monotonic_increasing


def test_invalid_split_ratio(sample_clean_df):
    with pytest.raises(ValueError):
        chronological_train_test_split(sample_clean_df, test_ratio=1.5)
    with pytest.raises(ValueError):
        chronological_train_test_split(sample_clean_df, test_ratio=-0.1)


def test_feature_engineering_zero_lookahead():
    """
    Validates strictly that features generated at time t do NOT look ahead to time t or future.
    """
    # Create simple sequential series
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=20, freq="D"),
        "target_value": [float(i) for i in range(20)],
    })

    feat_df, cols = create_time_series_features(
        df,
        target_col="target_value",
        lags=[1, 2],
        rolling_windows=[3],
        include_calendar=False,
    )

    # For any row in feat_df, lag_1 MUST equal target_value of the preceding row
    for i in range(1, len(feat_df)):
        assert feat_df.loc[i, "lag_1"] == feat_df.loc[i - 1, "target_value"]
        if i >= 2:
            assert feat_df.loc[i, "lag_2"] == feat_df.loc[i - 2, "target_value"]

    # Rolling mean for window 3 at index i must be the mean of rows i-3, i-2, i-1 (strictly excluding current row i)
    for i in range(3, len(feat_df)):
        expected_rolling_mean = (
            feat_df.loc[i - 1, "target_value"]
            + feat_df.loc[i - 2, "target_value"]
            + feat_df.loc[i - 3, "target_value"]
        ) / 3.0
        assert np.isclose(feat_df.loc[i, "rolling_mean_3"], expected_rolling_mean)
