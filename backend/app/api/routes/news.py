from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.news import NewsResponse
from app.services.news_service import news_service

router = APIRouter(tags=["News & Sentiment"])


@router.get("/news", response_model=NewsResponse)
async def get_market_news(
    query: str = Query("market", description="Symbol or market keyword (e.g. AAPL, stock market, inflation)"),
    limit: int = Query(10, ge=1, le=50, description="Max articles to retrieve"),
):
    """
    Fetches real-time financial market news and sentiment polarity breakdown via GNews / NewsAPI.
    """
    try:
        return await news_service.get_market_news(query=query, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market news: {str(e)}")
