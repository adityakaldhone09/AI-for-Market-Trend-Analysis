from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.signal import ResearchSignalRequest, ResearchSignalResponse
from app.services.signal_service import signal_service

router = APIRouter(tags=["Research Signals"])


@router.post("/signals", response_model=ResearchSignalResponse)
def generate_signal(request: ResearchSignalRequest):
    """
    Generates an explainable research signal with factor-based breakdown,
    target price estimate, invalidation criteria, and regulatory disclaimers.
    """
    try:
        return signal_service.generate_research_signal(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signal: {str(e)}")


@router.get("/signals/latest", response_model=ResearchSignalResponse)
def get_latest_signal(
    symbol: Optional[str] = Query("NIFTY50", description="Index or market symbol"),
    horizon: int = Query(5, ge=1, le=10, description="Forecast horizon in sessions"),
):
    """
    Convenience GET endpoint for current market signal.
    """
    try:
        req = ResearchSignalRequest(symbol=symbol, horizon_days=horizon)
        return signal_service.generate_research_signal(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve latest signal: {str(e)}")
