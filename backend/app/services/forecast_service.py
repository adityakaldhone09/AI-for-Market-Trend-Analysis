from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import pandas as pd
from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError
from app.ml.baseline import MovingAverageBaselineModel, NaiveBaselineModel
from app.ml.predict import ModelPredictor
from app.ml.train import ModelTrainer
from app.schemas.forecast import ForecastPoint, ForecastRequest, ForecastResponse, ModelMetadata


class ForecastService:
    """Orchestrates time-series baseline forecasts and ML model inference."""

    AVAILABLE_MODELS = [
        ModelMetadata(
            model_id="baseline_naive",
            name="Naïve Persistence Baseline",
            model_type="baseline",
            version="1.0.0",
            readiness_status="ready",
            description="Predicts that future values will remain equal to the most recent historical observation.",
            parameters={"horizon_range": "1-60 days"},
        ),
        ModelMetadata(
            model_id="baseline_sma",
            name="Simple Moving Average Baseline",
            model_type="baseline",
            version="1.0.0",
            readiness_status="ready",
            description="Rolls forward autoregressively using the average of the last k observations.",
            parameters={"window_default": 5, "window_range": "2-30"},
        ),
        ModelMetadata(
            model_id="linear_regression",
            name="Linear Regression with Lag Features",
            model_type="regression",
            version="1.0.0",
            readiness_status="ready",
            description="Scikit-learn ordinary least squares regression trained on leakage-free lags and rolling stats.",
            parameters={"lags": [1, 2, 3, 5, 7], "rolling_windows": [3, 7, 14]},
        ),
        ModelMetadata(
            model_id="ridge",
            name="Ridge Regression (L2 Regularized)",
            model_type="regression",
            version="1.0.0",
            readiness_status="ready",
            description="L2 regularized linear model preventing overfitting on collinear financial lag features.",
            parameters={"alpha": 1.0, "lags": [1, 2, 3, 5, 7], "rolling_windows": [3, 7, 14]},
        ),
        ModelMetadata(
            model_id="random_forest",
            name="Random Forest Regressor",
            model_type="ensemble",
            version="1.0.0",
            readiness_status="ready",
            description="Non-linear tree-based ensemble capturing complex multi-lag interactions.",
            parameters={"n_estimators": 100, "max_depth": 6},
        ),
    ]

    def __init__(self):
        self.loader = CSVDataLoader()
        self.trainer = ModelTrainer()
        self.predictor = ModelPredictor()

    def get_available_models(self) -> List[ModelMetadata]:
        return self.AVAILABLE_MODELS

    def generate_forecast(self, request: ForecastRequest) -> ForecastResponse:
        """Dispatches forecast generation to the appropriate baseline or ML engine."""
        target_dataset = request.dataset_name or settings.DEFAULT_DATASET
        df, meta = self.loader.load_dataset(target_dataset, target_col=request.target_col)
        selected_target = meta["default_target"]

        history_series = df[selected_target].values
        last_date = pd.to_datetime(df["timestamp"].iloc[-1])
        last_val = float(history_series[-1])

        model_type = request.model_type.lower()
        forecast_points: List[ForecastPoint] = []
        training_ctx: Dict[str, Any] = {
            "dataset_rows": len(df),
            "date_range": meta["date_range"],
            "model_type": model_type,
        }

        # 1. Baseline: Naïve
        if model_type == "baseline_naive":
            model = NaiveBaselineModel()
            raw_forecasts = model.forecast_future(history_series, horizon=request.horizon)
            for step, val in enumerate(raw_forecasts, start=1):
                f_date = (last_date + timedelta(days=step)).strftime("%Y-%m-%d")
                forecast_points.append(
                    ForecastPoint(step=step, timestamp=f_date, predicted_value=val)
                )
            model_name = "Naive Persistence Baseline"
            model_ver = "1.0.0"

        # 2. Baseline: Simple Moving Average
        elif model_type == "baseline_sma":
            window = request.sma_window or 5
            model = MovingAverageBaselineModel(window=window)
            raw_forecasts = model.forecast_future(history_series, horizon=request.horizon)
            for step, val in enumerate(raw_forecasts, start=1):
                f_date = (last_date + timedelta(days=step)).strftime("%Y-%m-%d")
                forecast_points.append(
                    ForecastPoint(step=step, timestamp=f_date, predicted_value=val)
                )
            model_name = f"Simple Moving Average (Window={window})"
            model_ver = "1.0.0"

        # 3. ML Models: Linear Regression or Ridge
        elif model_type in ["linear_regression", "ridge"]:
            # Check if artifact exists; if not, train once and persist
            bundle = self.predictor.load_latest_artifact(model_type, target_dataset)
            if not bundle:
                logger.info(f"No existing artifact for {model_type} on {target_dataset}. Training initial model.")
                train_result = self.trainer.train(
                    df=df,
                    target_col=selected_target,
                    model_type=model_type,
                    dataset_name=target_dataset,
                )
                bundle = train_result["bundle"]

            training_ctx["model_id"] = bundle["metadata"]["model_id"]
            training_ctx["metrics"] = bundle["metadata"]["metrics"]
            training_ctx["features"] = bundle["metadata"]["feature_cols"]

            raw_points = self.predictor.forecast_multistep(
                df=df,
                model_bundle=bundle,
                horizon=request.horizon,
                target_col=selected_target,
            )

            for pt in raw_points:
                forecast_points.append(
                    ForecastPoint(
                        step=pt["step"],
                        timestamp=pt["timestamp"],
                        predicted_value=pt["predicted_value"],
                        lower_bound=pt["lower_bound"],
                        upper_bound=pt["upper_bound"],
                    )
                )
            model_name = f"Scikit-learn {model_type.replace('_', ' ').title()}"
            model_ver = bundle["metadata"]["version"]

        else:
            raise DataIngestionError(
                f"Unknown model_type '{request.model_type}'. Supported: {[m.model_id for m in self.AVAILABLE_MODELS]}"
            )

        return ForecastResponse(
            model_name=model_name,
            model_version=model_ver,
            dataset_name=target_dataset,
            target_col=selected_target,
            horizon=request.horizon,
            is_synthetic=meta["is_synthetic"],
            last_historical_timestamp=last_date.strftime("%Y-%m-%d"),
            last_historical_value=round(last_val, 2),
            forecasts=forecast_points,
            training_context=training_ctx,
        )


forecast_service = ForecastService()
