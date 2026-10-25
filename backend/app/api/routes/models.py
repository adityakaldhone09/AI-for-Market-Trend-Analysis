from fastapi import APIRouter
from app.schemas.forecast import ModelListResponse
from app.services.forecast_service import forecast_service

router = APIRouter(tags=["Models"])


@router.get("/models", response_model=ModelListResponse)
def get_available_models():
    """Returns available forecasting models, readiness status, and architectural hyperparameters."""
    models = forecast_service.get_available_models()
    compat_models = []
    for model in models:
        compat_models.append(
            {
                "model_id": model.model_id,
                "key": model.model_id,
                "name": model.name,
                "model_type": model.model_type,
                "type": model.model_type,
                "version": model.version,
                "readiness_status": model.readiness_status,
                "status": model.readiness_status,
                "description": model.description,
                "parameters": model.parameters,
            }
        )
    return ModelListResponse(
        total_models=len(models),
        models=compat_models,
    )
