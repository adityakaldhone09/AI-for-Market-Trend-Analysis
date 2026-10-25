from typing import List, Optional, Union
import numpy as np
import pandas as pd


class NaiveBaselineModel:
    """
    Naïve persistence baseline forecasting model.
    Predicts y_{t+h} = y_t (the most recent known value).
    Essential benchmark for time series regression.
    """
    def __init__(self):
        self.model_name = "Naive Persistence Baseline"
        self.version = "1.0.0"
        self.last_value: Optional[float] = None

    def fit(self, y: Union[pd.Series, np.ndarray, List[float]]) -> "NaiveBaselineModel":
        arr = np.asarray(y)
        if len(arr) == 0:
            raise ValueError("Training series cannot be empty.")
        self.last_value = float(arr[-1])
        return self

    def predict(self, y_history: Union[pd.Series, np.ndarray]) -> np.ndarray:
        """
        One-step-ahead prediction: predicts the preceding value (shift 1).
        """
        arr = np.asarray(y_history)
        if len(arr) == 0:
            return np.array([])
        # For evaluation over a sequence, prediction for t is observation at t-1
        predictions = np.empty_like(arr, dtype=float)
        predictions[0] = arr[0]  # initial step fallback
        predictions[1:] = arr[:-1]
        return predictions

    def forecast_future(self, history: Union[pd.Series, np.ndarray], horizon: int) -> List[float]:
        """Multi-step future forecast: constant continuation of the latest observed value."""
        arr = np.asarray(history)
        if len(arr) == 0:
            raise ValueError("History cannot be empty.")
        val = float(arr[-1])
        return [round(val, 4) for _ in range(horizon)]


class MovingAverageBaselineModel:
    """
    Simple Moving Average (SMA) baseline forecasting model.
    Predicts future values based on the mean of the last k observed values.
    """
    def __init__(self, window: int = 5):
        if window < 1:
            raise ValueError("Window size must be at least 1.")
        self.window = window
        self.model_name = f"Simple Moving Average (Window={window})"
        self.version = "1.0.0"

    def fit(self, y: Union[pd.Series, np.ndarray]) -> "MovingAverageBaselineModel":
        arr = np.asarray(y)
        if len(arr) < self.window:
            raise ValueError(f"History length {len(arr)} is smaller than window {self.window}.")
        return self

    def predict(self, y_history: Union[pd.Series, np.ndarray]) -> np.ndarray:
        """One-step-ahead rolling mean predictions."""
        s = pd.Series(y_history)
        preds = s.shift(1).rolling(window=self.window, min_periods=1).mean()
        return preds.to_numpy()

    def forecast_future(self, history: Union[pd.Series, np.ndarray], horizon: int) -> List[float]:
        """Autoregressively rolls forward using moving average over the updated window."""
        arr = list(np.asarray(history, dtype=float))
        if len(arr) < self.window:
            raise ValueError(f"History length {len(arr)} is smaller than window {self.window}.")

        forecasts = []
        for _ in range(horizon):
            next_val = float(np.mean(arr[-self.window:]))
            forecasts.append(round(next_val, 4))
            arr.append(next_val)

        return forecasts
