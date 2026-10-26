from fastapi import APIRouter, HTTPException
from app.data.loaders.csv_loader import DataIngestionError
from app.schemas.forecast import EvaluationRequest, EvaluationResponse
from app.services.evaluation_service import evaluation_service

router = APIRouter(tags=["Evaluations"])


@router.post("/evaluations", response_model=EvaluationResponse)
def evaluate_model(request: EvaluationRequest):
    """
    Evaluates forecasting models on chronological holdout partitions and benchmarks against Naive Baseline.
    """
    try:
        response = evaluation_service.evaluate_model(request)
        payload = response.model_dump()
        payload["dataset"] = payload.get("dataset_name")
        payload["symbol"] = request.symbol or request.dataset_name or payload.get("dataset_name")
        payload["target"] = request.target or request.target_col or payload.get("target_col")
        payload["model"] = request.model or request.model_type
        payload["modelName"] = payload.get("model_name")
        payload["version"] = payload.get("version", "1.0.0")
        metrics_dict = payload.get("metrics")
        if isinstance(metrics_dict, dict):
            payload["mae"] = metrics_dict.get("mae")
            payload["rmse"] = metrics_dict.get("rmse")
            payload["mse"] = metrics_dict.get("mse")
            payload["r2"] = metrics_dict.get("r2")
        t_start = payload.get("test_date_range", {}).get("start_date")
        t_end = payload.get("test_date_range", {}).get("end_date")
        payload["test_period"] = {
            "start": t_start,
            "end": t_end,
        }
        payload["period"] = f"{t_start} to {t_end}"
        payload["data_is_synthetic"] = payload.get("is_synthetic", False)
        return payload
    except DataIngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
