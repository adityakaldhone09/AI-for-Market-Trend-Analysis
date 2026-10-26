from fastapi import APIRouter, HTTPException
from app.schemas.breadth import MarketBreadthResponse, SectorsPerformanceResponse
from app.services.market_breadth_service import market_breadth_service

router = APIRouter(tags=["Market Breadth & Sectors"])


@router.get("/market-breadth", response_model=MarketBreadthResponse)
def get_market_breadth():
    """
    Returns market breadth indicators across top NIFTY 50 constituents:
    advances, declines, % above 20/50/200-day SMAs, and top contributors.
    """
    try:
        return market_breadth_service.get_market_breadth()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate market breadth: {str(e)}")


@router.get("/sectors/performance", response_model=SectorsPerformanceResponse)
def get_sectors_performance():
    """
    Returns relative strength and performance of official NSE Sector Indices
    (NIFTY Bank, IT, Auto, FMCG, Pharma) and India VIX volatility context.
    """
    try:
        return market_breadth_service.get_sectors_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate sector performance: {str(e)}")
