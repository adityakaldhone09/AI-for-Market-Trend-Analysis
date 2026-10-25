import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler

from app.core.config import settings
from app.core.logging import logger
from app.ml.evaluate import calculate_metrics
from app.ml.features import chronological_train_test_split, create_time_series_features


class ModelTrainer:
    """Trains scikit-learn time-series forecasting models with strict chronological hygiene."""

    SUPPORTED_MODELS = {
        "linear_regression": LinearRegression,
        "ridge": Ridge,
    }

    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = (artifacts_dir or settings.artifacts_path).resolve()
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def train(
        self,
        df: pd.DataFrame,
        target_col: str = "target_value",
        model_type: str = "ridge",
        test_ratio: float = 0.2,
        dataset_name: str = "unknown",
        alpha: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end model training:
        1. Generates features with zero lookahead.
        2. Splits chronologically into train and holdout validation sets.
        3. Fits scaler strictly on training data.
        4. Trains the estimator.
        5. Evaluates on holdout set.
        6. Persists artifacts (model, scaler, metadata).
        """
        if model_type not in self.SUPPORTED_MODELS:
            raise ValueError(
                f"Unsupported model type '{model_type}'. Choose from: {list(self.SUPPORTED_MODELS.keys())}"
            )

        logger.info(f"Engineering features for target='{target_col}' on {dataset_name}")
        featured_df, feature_cols = create_time_series_features(df, target_col=target_col)

        # Chronological Split
        train_df, test_df = chronological_train_test_split(featured_df, test_ratio=test_ratio)

        X_train = train_df[feature_cols].values
        y_train = train_df[target_col].values
        X_test = test_df[feature_cols].values
        y_test = test_df[target_col].values

        # Leakage Prevention: Fit scaler strictly on training set
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Initialize and fit model
        model_cls = self.SUPPORTED_MODELS[model_type]
        if model_type == "ridge":
            model = model_cls(alpha=alpha)
        else:
            model = model_cls()

        model.fit(X_train_scaled, y_train)

        # Evaluate on holdout test set
        test_preds = model.predict(X_test_scaled)
        metrics = calculate_metrics(y_test, test_preds)

        # Calculate prediction residual std on validation set to build future confidence intervals
        residuals = y_test - test_preds
        residual_std = float(np.std(residuals))

        # Build metadata
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        version = f"v_{timestamp_str}"
        model_id = f"{model_type}_{dataset_name}_{version}".replace(".csv", "").replace("/", "_")

        metadata = {
            "model_id": model_id,
            "model_type": model_type,
            "version": version,
            "dataset_name": dataset_name,
            "target_col": target_col,
            "feature_cols": feature_cols,
            "residual_std": residual_std,
            "metrics": metrics,
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "train_date_range": {
                "start": str(train_df["timestamp"].iloc[0]),
                "end": str(train_df["timestamp"].iloc[-1]),
            },
            "test_date_range": {
                "start": str(test_df["timestamp"].iloc[0]),
                "end": str(test_df["timestamp"].iloc[-1]),
            },
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }

        # Persist artifacts
        artifact_path = self.artifacts_dir / f"{model_id}.joblib"
        metadata_path = self.artifacts_dir / f"{model_id}_metadata.json"

        bundle = {
            "model": model,
            "scaler": scaler,
            "feature_cols": feature_cols,
            "metadata": metadata,
        }
        joblib.dump(bundle, artifact_path)

        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Model saved to {artifact_path} with test MAE={metrics['mae']}")
        return {
            "model_id": model_id,
            "metadata": metadata,
            "artifact_path": str(artifact_path),
            "bundle": bundle,
        }
