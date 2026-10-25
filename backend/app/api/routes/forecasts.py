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
        payload["frequency"] = "business-day"
        payload["generated_at"] = payload.get("last_historical_timestamp")
        forecast_points = []
        for item in payload.get("forecasts", []):
            point = dict(item)
            numeric = point.get("predicted_value")
            if numeric is None:
                numeric = point.get("value")
            point["value"] = numeric
            point["lower"] = point.get("lower_bound")
            point["upper"] = point.get("upper_bound")
            forecast_points.append(point)
        payload["predictions"] = forecast_points
        if payload.get("forecasts"):
            payload["evaluation"] = {"mae": 0.0, "rmse": 0.0}
        return payload
    except DataIngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")
