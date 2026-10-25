from pathlib import Path
import pytest
from app.data.loaders.csv_loader import CSVDataLoader
from app.ml.predict import ModelPredictor
from app.ml.train import ModelTrainer


def test_train_and_predict_pipeline(tmp_path):
    loader = CSVDataLoader()
    df, meta = loader.load_dataset("synthetic_market_data.csv")

    trainer = ModelTrainer(artifacts_dir=tmp_path)
    res = trainer.train(
        df=df,
        target_col="target_value",
        model_type="ridge",
        test_ratio=0.2,
        dataset_name="synthetic_test",
        alpha=1.0,
    )

    assert "model_id" in res
    assert Path(res["artifact_path"]).exists()
    assert res["metadata"]["metrics"]["mae"] > 0
    assert len(res["metadata"]["feature_cols"]) > 0

    # Predictor multi-step inference
    predictor = ModelPredictor(artifacts_dir=tmp_path)
    bundle = predictor.load_latest_artifact("ridge", "synthetic_test")
    assert bundle is not None

    forecasts = predictor.forecast_multistep(
        df=df,
        model_bundle=bundle,
        horizon=7,
        target_col="target_value",
    )
    assert len(forecasts) == 7
    assert forecasts[0]["step"] == 1
    assert "predicted_value" in forecasts[0]
    assert "lower_bound" in forecasts[0]
    assert "upper_bound" in forecasts[0]
    # Verify confidence intervals enclose or bracket the prediction
    assert forecasts[0]["lower_bound"] <= forecasts[0]["predicted_value"] <= forecasts[0]["upper_bound"]
