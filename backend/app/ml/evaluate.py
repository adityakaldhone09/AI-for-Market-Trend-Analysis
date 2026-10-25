from typing import Dict, Union
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def calculate_metrics(
    y_true: Union[np.ndarray, list],
    y_pred: Union[np.ndarray, list],
    eps: float = 1e-8,
) -> Dict[str, float]:
    """
    Computes standard regression & direction evaluation metrics with zero-division safety.
    """
    yt = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)

    if len(yt) != len(yp):
        raise ValueError(f"Lengths must match: len(y_true)={len(yt)} vs len(y_pred)={len(yp)}")

    if len(yt) == 0:
        return {"mae": 0.0, "rmse": 0.0, "mse": 0.0, "r2": 0.0, "mape": 0.0, "direction_accuracy": 0.0}

    # Filter any NaNs if present
    mask = ~(np.isnan(yt) | np.isnan(yp))
    yt = yt[mask]
    yp = yp[mask]

    if len(yt) == 0:
        return {"mae": 0.0, "rmse": 0.0, "mse": 0.0, "r2": 0.0, "mape": 0.0, "direction_accuracy": 0.0}

    mae = float(mean_absolute_error(yt, yp))
    mse = float(mean_squared_error(yt, yp))
    rmse = float(np.sqrt(mse))

    # R2 can be negative if model performs worse than the mean
    try:
        r2 = float(r2_score(yt, yp))
        if np.isnan(r2):
            r2 = 0.0
    except Exception:
        r2 = 0.0

    # MAPE with epsilon guard to handle zero/near-zero denominators
    denom = np.where(np.abs(yt) < eps, eps, np.abs(yt))
    mape = float(np.mean(np.abs((yt - yp) / denom)) * 100)

    # Direction Accuracy (Sign of price movement from preceding step)
    if len(yt) > 1:
        actual_direction = np.sign(yt[1:] - yt[:-1])
        predicted_direction = np.sign(yp[1:] - yt[:-1])
        # Exact direction match: actual_direction == predicted_direction
        matches = (actual_direction == predicted_direction)
        direction_accuracy = float(np.mean(matches) * 100)
    else:
        direction_accuracy = 100.0

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mse": round(mse, 4),
        "r2": round(r2, 4),
        "mape": round(mape, 2),
        "direction_accuracy": round(direction_accuracy, 2),
    }


def compare_with_baseline(
    model_metrics: Dict[str, float],
    baseline_metrics: Dict[str, float],
) -> Dict[str, float]:
    """
    Computes percentage improvement of model over baseline for key metrics.
    Positive percentage means improvement (e.g. lower MAE or higher R2).
    """
    improvements = {}
    for metric in ["mae", "rmse", "mse"]:
        base_val = baseline_metrics.get(metric, 0.0)
        mod_val = model_metrics.get(metric, 0.0)
        if base_val > 0:
            improvements[f"{metric}_reduction_pct"] = round(((base_val - mod_val) / base_val) * 100, 2)
        else:
            improvements[f"{metric}_reduction_pct"] = 0.0

    # Direction accuracy improvement
    base_dir = baseline_metrics.get("direction_accuracy", 0.0)
    mod_dir = model_metrics.get("direction_accuracy", 0.0)
    improvements["direction_accuracy_gain_pct"] = round(mod_dir - base_dir, 2)

    return improvements
