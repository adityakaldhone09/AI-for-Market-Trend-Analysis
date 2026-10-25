import numpy as np
import pytest
from app.ml.baseline import MovingAverageBaselineModel, NaiveBaselineModel
from app.ml.evaluate import calculate_metrics, compare_with_baseline


def test_naive_baseline_model():
    history = [100.0, 102.0, 101.5, 103.0]
    model = NaiveBaselineModel()
    model.fit(history)
    assert model.last_value == 103.0

    # Multi-step future forecast should repeat the last observation
    forecasts = model.forecast_future(history, horizon=5)
    assert len(forecasts) == 5
    assert all(f == 103.0 for f in forecasts)

    # In-sample 1-step prediction
    preds = model.predict(history)
    assert len(preds) == len(history)
    assert preds[1] == history[0]
    assert preds[-1] == history[-2]


def test_moving_average_baseline_model():
    history = [10.0, 20.0, 30.0, 40.0, 50.0]
    model = MovingAverageBaselineModel(window=3)
    model.fit(history)

    # Last 3 are 30, 40, 50 -> mean = 40.0
    forecasts = model.forecast_future(history, horizon=2)
    assert len(forecasts) == 2
    assert forecasts[0] == 40.0
    # Next step window: 40, 50, 40 -> mean = 43.3333
    assert np.isclose(forecasts[1], 43.3333, atol=1e-2)


def test_calculate_metrics():
    y_true = np.array([100.0, 105.0, 110.0, 115.0])
    y_pred = np.array([100.0, 104.0, 111.0, 116.0])

    metrics = calculate_metrics(y_true, y_pred)
    assert metrics["mae"] == 0.75
    assert metrics["rmse"] > 0
    assert metrics["r2"] > 0.95
    assert metrics["direction_accuracy"] == 100.0


def test_calculate_metrics_with_zeros():
    # Verify zero-division protection does not crash or return inf
    y_true = np.array([0.0, 0.0, 1.0])
    y_pred = np.array([0.0, 0.1, 1.0])
    metrics = calculate_metrics(y_true, y_pred)
    assert np.isfinite(metrics["mape"])
    assert metrics["mae"] > 0


def test_compare_with_baseline():
    base = {"mae": 5.0, "rmse": 7.0, "mse": 49.0, "direction_accuracy": 50.0}
    model = {"mae": 4.0, "rmse": 5.6, "mse": 31.36, "direction_accuracy": 65.0}

    improvements = compare_with_baseline(model, base)
    assert improvements["mae_reduction_pct"] == 20.0
    assert improvements["direction_accuracy_gain_pct"] == 15.0
