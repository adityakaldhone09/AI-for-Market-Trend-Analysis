from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError
from app.ml.baseline import MovingAverageBaselineModel, NaiveBaselineModel
from app.ml.evaluate import calculate_metrics, compare_with_baseline
from app.ml.features import chronological_train_test_split, create_time_series_features
from app.ml.train import ModelTrainer
from app.schemas.forecast import EvaluationRequest, EvaluationResponse, MetricScore
from app.schemas.market import DateRange


class EvaluationService:
    """Evaluates time-series models on strict chronological holdout splits and benchmarks against baseline."""

    def __init__(self):
        self.loader = CSVDataLoader()
        self.trainer = ModelTrainer()

    def evaluate_model(self, request: EvaluationRequest) -> EvaluationResponse:
        """Runs chronological validation comparing the candidate model against the Naive Baseline."""
        target_dataset = request.dataset_name or settings.DEFAULT_DATASET
        df, meta = self.loader.load_dataset(target_dataset, target_col=request.target_col)
        selected_target = meta["default_target"]

        # Feature engineering
        feat_df, feature_cols = create_time_series_features(df, target_col=selected_target)
        train_df, test_df = chronological_train_test_split(feat_df, test_ratio=request.test_ratio)

        y_test = test_df[selected_target].values

        # 1. Baseline Evaluation on Test Set (1-step persistence baseline)
        naive_model = NaiveBaselineModel()
        # For evaluation, full sequence to predict test_df uses test_df target values with shift 1
        naive_preds = naive_model.predict(y_test)
        naive_metrics_raw = calculate_metrics(y_test, naive_preds)
        naive_metrics = MetricScore(**naive_metrics_raw)

        model_type = request.model_type.lower()
        if model_type == "baseline_naive":
            candidate_preds = naive_preds
            candidate_metrics_raw = naive_metrics_raw
            model_id = "baseline_naive"
            model_name = "Naive Persistence Baseline"

        elif model_type == "baseline_sma":
            sma_model = MovingAverageBaselineModel(window=request.sma_window)
            sma_preds = sma_model.predict(y_test)
            candidate_preds = sma_preds
            candidate_metrics_raw = calculate_metrics(y_test, sma_preds)
            model_id = f"baseline_sma_w{request.sma_window}"
            model_name = f"Simple Moving Average (Window={request.sma_window})"

        elif model_type in ["linear_regression", "ridge"]:
            # Train model cleanly on training partition
            train_result = self.trainer.train(
                df=df,
                target_col=selected_target,
                model_type=model_type,
                test_ratio=request.test_ratio,
                dataset_name=target_dataset,
            )
            bundle = train_result["bundle"]
            model = bundle["model"]
            scaler = bundle["scaler"]

            X_test = test_df[feature_cols].values
            X_test_scaled = scaler.transform(X_test)
            test_preds = model.predict(X_test_scaled)
            candidate_preds = test_preds

            candidate_metrics_raw = calculate_metrics(y_test, test_preds)
            model_id = bundle["metadata"]["model_id"]
            model_name = f"Scikit-learn {model_type.replace('_', ' ').title()}"

        else:
            raise DataIngestionError(f"Unsupported model_type for evaluation: '{request.model_type}'")

        candidate_metrics = MetricScore(**candidate_metrics_raw)
        improvements = compare_with_baseline(candidate_metrics_raw, naive_metrics_raw)

        eval_values = []
        for i in range(len(y_test)):
            ts_val = test_df["timestamp"].iloc[i]
            ts_str = ts_val.strftime("%Y-%m-%d") if hasattr(ts_val, "strftime") else str(ts_val)[:10]
            eval_values.append({
                "date": ts_str,
                "actual": round(float(y_test[i]), 2),
                "predicted": round(float(candidate_preds[i]), 2),
            })

        t_start = str(test_df["timestamp"].iloc[0].strftime("%Y-%m-%d"))
        t_end = str(test_df["timestamp"].iloc[-1].strftime("%Y-%m-%d"))

        return EvaluationResponse(
            model_id=model_id,
            model_name=model_name,
            modelName=model_name,
            version="1.0.0",
            dataset_name=target_dataset,
            target_col=selected_target,
            horizon=request.horizon,
            train_date_range=DateRange(
                start_date=str(train_df["timestamp"].iloc[0].strftime("%Y-%m-%d")),
                end_date=str(train_df["timestamp"].iloc[-1].strftime("%Y-%m-%d")),
            ),
            test_date_range=DateRange(
                start_date=t_start,
                end_date=t_end,
            ),
            period=f"{t_start} to {t_end}",
            train_samples=len(train_df),
            test_samples=len(test_df),
            metrics=candidate_metrics,
            baseline_naive_metrics=naive_metrics,
            performance_improvement_pct=improvements,
            evaluation_timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            values=eval_values,
            is_synthetic=meta.get("is_synthetic", False),
            data_is_synthetic=meta.get("is_synthetic", False),
        )


evaluation_service = EvaluationService()
