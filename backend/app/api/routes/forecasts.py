from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.data.loaders.csv_loader import DataIngestionError
from app.schemas.forecast import ForecastRequest, ForecastResponse
from app.services.forecast_service import forecast_service

router = APIRouter(tags=["Forecasts"])


@router.post("/forecasts", response_model=ForecastResponse)
def create_forecast(request: ForecastRequest):
    """
    Generates time-series forecasts using the requested model (Baseline Naive, SMA, or Scikit-Learn Regression).
    """
    try:
        response = forecast_service.generate_forecast(request)
        payload = response.model_dump()
        payload["symbol"] = request.symbol or request.dataset_name or payload.get("dataset_name")
        payload["dataset"] = payload.get("dataset_name")
        payload["target"] = request.target or request.target_col or payload.get("target_col")
        payload["model"] = request.model or request.model_type
        payload["model_id"] = request.model_type
        payload["frequency"] = "daily"
        gen_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        payload["generated_at"] = gen_time
        payload["createdAt"] = gen_time
        payload["marketId"] = payload.get("symbol") or payload.get("dataset_name")
        payload["modelName"] = payload.get("model_name")
        payload["modelVersion"] = payload.get("model_version")
        payload["data_is_synthetic"] = payload.get("is_synthetic", False)

        forecast_points = []
        values_points = []
        for item in payload.get("forecasts", []):
            point = dict(item)
            numeric = point.get("predicted_value")
            if numeric is None:
                numeric = point.get("value")
            point["value"] = numeric
            point["lower"] = point.get("lower_bound")
            point["upper"] = point.get("upper_bound")
            forecast_points.append(point)
            values_points.append({
                "date": point.get("timestamp"),
                "predicted": numeric,
                "lowerBound": point.get("lower_bound"),
                "upperBound": point.get("upper_bound"),
            })
        payload["predictions"] = forecast_points
        payload["values"] = values_points
        # Do not fabricate evaluation metrics like {"mae": 0.0, "rmse": 0.0}
        # Evaluation is computed genuinely via POST /api/v1/evaluations
        payload["evaluation"] = None
        return payload
    except DataIngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")
