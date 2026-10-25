import re
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.news import NewsArticle, NewsResponse, SentimentOverview


class NewsService:
    """
    Connects to GNews / NewsAPI using .env credentials and runs rule-based sentiment scoring.
    """

    BULLISH_KEYWORDS = {
        "surge", "surges", "gain", "gains", "jump", "jumps", "rally", "rallies", "growth",
        "profit", "profits", "bull", "bullish", "upgrade", "outperform", "beat", "beats",
        "record", "high", "dividend", "boost", "optimism", "recovery", "soars", "up",
    }
    BEARISH_KEYWORDS = {
        "drop", "drops", "fall", "falls", "plunge", "plunges", "slump", "loss", "losses",
        "bear", "bearish", "downgrade", "underperform", "miss", "misses", "crash", "decline",
        "warning", "lawsuit", "investigation", "tariff", "risk", "recession", "down",
    }

    def __init__(self):
        self.provider = (settings.NEWS_PROVIDER or "gnews").lower()
        self.gnews_key = settings.GNEWS_API_KEY
        self.newsapi_key = settings.NEWSAPI_API_KEY

    def score_text_sentiment(self, text: str) -> float:
        """Computes a normalized polarity score from -1.0 to +1.0."""
        words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
        if not words:
            return 0.0

        pos = sum(1 for w in words if w in self.BULLISH_KEYWORDS)
        neg = sum(1 for w in words if w in self.BEARISH_KEYWORDS)

        total = pos + neg
        if total == 0:
            return 0.0
        return round((pos - neg) / total, 2)

    async def fetch_gnews(self, query: str, limit: int = 10) -> List[NewsArticle]:
        if not self.gnews_key:
            raise ValueError("GNEWS_API_KEY is not configured in .env.")

        url = (
            f"https://gnews.io/api/v4/search?"
            f"q={query}&lang=en&max={min(limit, 10)}&apikey={self.gnews_key}"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        articles = []
        for item in data.get("articles", []):
            title = item.get("title", "")
            desc = item.get("description", "")
            combined_text = f"{title} {desc}"
            score = self.score_text_sentiment(combined_text)

            if score > 0.15:
                sentiment = "bullish"
            elif score < -0.15:
                sentiment = "bearish"
            else:
                sentiment = "neutral"

            articles.append(
                NewsArticle(
                    title=title,
                    description=desc,
                    url=item.get("url", ""),
                    source_name=item.get("source", {}).get("name", "Unknown"),
                    published_at=item.get("publishedAt", ""),
                    sentiment=sentiment,
                    sentiment_score=score,
                )
            )

        return articles

    async def fetch_newsapi(self, query: str, limit: int = 10) -> List[NewsArticle]:
        if not self.newsapi_key:
            raise ValueError("NEWSAPI_API_KEY is not configured in .env.")

        url = (
            f"https://newsapi.org/v2/everything?"
            f"q={query}&language=en&pageSize={min(limit, 20)}&apiKey={self.newsapi_key}"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        articles = []
        for item in data.get("articles", []):
            title = item.get("title", "")
            desc = item.get("description", "")
            score = self.score_text_sentiment(f"{title} {desc}")
            sentiment = "bullish" if score > 0.15 else ("bearish" if score < -0.15 else "neutral")

            articles.append(
                NewsArticle(
                    title=title,
                    description=desc,
                    url=item.get("url", ""),
                    source_name=item.get("source", {}).get("name", "Unknown"),
                    published_at=item.get("publishedAt", ""),
                    sentiment=sentiment,
                    sentiment_score=score,
                )
            )

        return articles

    async def get_market_news(self, query: str = "market", limit: int = 10) -> NewsResponse:
        """Fetches market news and compiles overall sentiment overview."""
        logger.info(f"Fetching news for query='{query}' via {self.provider}")
        articles: List[NewsArticle] = []

        if self.provider == "newsapi" or (not self.gnews_key and self.newsapi_key):
            articles = await self.fetch_newsapi(query, limit=limit)
            active_provider = "NewsAPI"
        else:
            articles = await self.fetch_gnews(query, limit=limit)
            active_provider = "GNews"

        bullish = sum(1 for a in articles if a.sentiment == "bullish")
        bearish = sum(1 for a in articles if a.sentiment == "bearish")
        neutral = sum(1 for a in articles if a.sentiment == "neutral")

        avg_score = round(sum(a.sentiment_score for a in articles) / len(articles), 2) if articles else 0.0

        if avg_score > 0.1:
            verdict = "Bullish"
        elif avg_score < -0.1:
            verdict = "Bearish"
        else:
            verdict = "Neutral"

        sentiment_overview = SentimentOverview(
            query=query,
            total_articles=len(articles),
            bullish_count=bullish,
            bearish_count=bearish,
            neutral_count=neutral,
            sentiment_score=avg_score,
            verdict=verdict,
        )

        return NewsResponse(
            provider=active_provider,
            sentiment=sentiment_overview,
            articles=articles,
        )


news_service = NewsService()
