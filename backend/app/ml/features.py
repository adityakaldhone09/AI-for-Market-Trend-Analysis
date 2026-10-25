from typing import List, Optional, Tuple
import numpy as np
import pandas as pd


def create_time_series_features(
    df: pd.DataFrame,
    target_col: str = "target_value",
    lags: List[int] = [1, 2, 3, 5, 7],
    rolling_windows: List[int] = [3, 7, 14],
    include_calendar: bool = True,
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Constructs time-series features strictly enforcing zero lookahead leakage.
    
    1. Lag features: target at t-k.
    2. Rolling features: rolling statistics over past windows (using .shift(1))
       so that index t depends ONLY on observations <= t-1.
    3. Calendar features: day_of_week, month, is_month_end.
    """
    data = df.copy()

    # Ensure timestamp is datetime
    if "timestamp" in data.columns and not pd.api.types.is_datetime64_any_dtype(data["timestamp"]):
        data["timestamp"] = pd.to_datetime(data["timestamp"])

    feature_cols: List[str] = []

    # 1. Lag features
    for lag in lags:
        col_name = f"lag_{lag}"
        data[col_name] = data[target_col].shift(lag)
        feature_cols.append(col_name)

    # 2. Rolling features (strictly shifted by 1 to eliminate current/future leakage)
    for window in rolling_windows:
        mean_col = f"rolling_mean_{window}"
        std_col = f"rolling_std_{window}"
        data[mean_col] = data[target_col].shift(1).rolling(window=window).mean()
        data[std_col] = data[target_col].shift(1).rolling(window=window).std().fillna(0)
        feature_cols.extend([mean_col, std_col])

    # 3. Calendar features
    if include_calendar and "timestamp" in data.columns:
        data["day_of_week"] = data["timestamp"].dt.day_of_week
        data["month"] = data["timestamp"].dt.month
        data["day_of_month"] = data["timestamp"].dt.day
        feature_cols.extend(["day_of_week", "month", "day_of_month"])

    # Drop the initial NaN rows caused by lags and rolling windows
    max_lookback = max(max(lags, default=0), max(rolling_windows, default=0))
    feature_df = data.iloc[max_lookback:].copy().reset_index(drop=True)

    return feature_df, feature_cols


def chronological_train_test_split(
    df: pd.DataFrame,
    test_ratio: float = 0.2,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits chronological data into train and test sets without shuffling,
    preserving natural temporal order to prevent time leakage.
    """
    if not 0.0 < test_ratio < 1.0:
        raise ValueError("test_ratio must be between 0.0 and 1.0.")

    n_samples = len(df)
    test_size = int(np.floor(n_samples * test_ratio))
    train_size = n_samples - test_size

    if train_size < 10 or test_size < 2:
        raise ValueError("Dataset is too small for chronological splitting with specified ratio.")

    train_df = df.iloc[:train_size].copy().reset_index(drop=True)
    test_df = df.iloc[train_size:].copy().reset_index(drop=True)

    return train_df, test_df
