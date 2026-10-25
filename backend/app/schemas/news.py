from typing import List, Optional
from pydantic import BaseModel


class NewsArticle(BaseModel):
    title: str
    description: Optional[str] = None
    url: str
    source_name: Optional[str] = None
    published_at: str
    sentiment: str  # "bullish", "bearish", "neutral"
    sentiment_score: float  # -1.0 to 1.0


class SentimentOverview(BaseModel):
    query: str
    total_articles: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    sentiment_score: float  # -1.0 (extremely bearish) to +1.0 (extremely bullish)
    verdict: str  # "Bullish", "Bearish", "Neutral"


class NewsResponse(BaseModel):
    provider: str
    sentiment: SentimentOverview
    articles: List[NewsArticle]
