from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
from app.core.config import settings
from app.core.logging import logger
from app.ml.features import create_time_series_features


class ModelPredictor:
    """Inference engine supporting multi-step forecasting with confidence bounds."""

    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = (artifacts_dir or settings.artifacts_path).resolve()

    def load_latest_artifact(self, model_type: str, dataset_name: str) -> Optional[Dict[str, Any]]:
        """Finds and loads the latest saved model bundle for a model type and dataset."""
        pattern = f"{model_type}_{dataset_name.replace('.csv', '')}_*.joblib"
        matches = sorted(self.artifacts_dir.glob(pattern), reverse=True)
        if not matches:
            return None
        latest_file = matches[0]
        logger.info(f"Loading trained model bundle from {latest_file}")
        return joblib.load(latest_file)

    def forecast_multistep(
        self,
        df: pd.DataFrame,
        model_bundle: Dict[str, Any],
        horizon: int = 7,
        target_col: str = "target_value",
    ) -> List[Dict[str, Any]]:
        """
        Generates recursive multi-step forecasts into the future using the trained model.
        Calculates empirical confidence intervals using validation residual error.
        """
        model = model_bundle["model"]
        scaler = model_bundle["scaler"]
        metadata = model_bundle["metadata"]
        residual_std = metadata.get("residual_std", 1.0)

        # Working copy to append recursive predictions
        sim_df = df[["timestamp", target_col]].copy()
        sim_df["timestamp"] = pd.to_datetime(sim_df["timestamp"])
        sim_df = sim_df.sort_values(by="timestamp").reset_index(drop=True)

        forecast_points = []
        last_date = sim_df["timestamp"].iloc[-1]

        for step in range(1, horizon + 1):
            # Compute features for latest state
            feat_df, feature_cols = create_time_series_features(sim_df, target_col=target_col)
            last_features = feat_df[feature_cols].iloc[[-1]].values

            # Scale and predict next step
            scaled_features = scaler.transform(last_features)
            pred_value = float(model.predict(scaled_features)[0])

            # Calculate expanding prediction uncertainty: sqrt(step) * 1.96 * std
            margin = 1.96 * residual_std * np.sqrt(step)
            lower = round(max(0.0, pred_value - margin), 2)
            upper = round(pred_value + margin, 2)

            next_date = last_date + timedelta(days=step)
            date_str = next_date.strftime("%Y-%m-%d")

            forecast_points.append({
                "step": step,
                "timestamp": date_str,
                "predicted_value": round(pred_value, 2),
                "lower_bound": lower,
                "upper_bound": upper,
            })

            # Append predicted value to sim_df for subsequent step feature calculations
            new_row = pd.DataFrame([{
                "timestamp": next_date,
                target_col: pred_value,
            }])
            sim_df = pd.concat([sim_df, new_row], ignore_index=True)

        return forecast_points
