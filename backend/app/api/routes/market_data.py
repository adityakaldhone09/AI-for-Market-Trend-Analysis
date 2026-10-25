from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.data.loaders.csv_loader import DataIngestionError
from app.schemas.market import MarketDataResponse
from app.services.data_service import data_service

router = APIRouter(tags=["Market Data"])


@router.get("/market-data", response_model=MarketDataResponse)
def get_market_data(
    dataset: Optional[str] = Query(None, description="Dataset filename (or symbol)"),
    symbol: Optional[str] = Query(None, description="Alias for dataset"),
    target_col: Optional[str] = Query(None, description="Target column"),
    target: Optional[str] = Query(None, description="Alias for target column"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    limit: Optional[int] = Query(None, ge=1, le=5000, description="Alias for page_size"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
):
    """
    Returns chronologically ordered market observations with pagination and date filtering.
    """
    dataset_name = dataset or symbol
    target_name = target_col or target
    resolved_page_size = limit if limit is not None else page_size
    try:
        response = data_service.get_market_data(
            dataset_name=dataset_name,
            target_col=target_name,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=resolved_page_size,
        )
        payload = response.model_dump()
        payload["dataset"] = payload.get("dataset_name")
        payload["symbol"] = symbol or dataset_name or payload.get("dataset_name")
        payload["target"] = target_name or payload.get("target_col")
        for point in payload.get("data", []):
            point["value"] = point.get("close") if point.get("close") is not None else point.get("target_value")
            point["price"] = point.get("close") if point.get("close") is not None else point.get("target_value")
            point["target"] = point.get("close") if point.get("close") is not None else point.get("target_value")
        return payload
    except DataIngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve market data.")
