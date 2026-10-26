from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.data.loaders.csv_loader import DataIngestionError
from app.schemas.analysis import DataSummaryResponse
from app.schemas.forecast import ForecastRequest
from app.services.analysis_service import analysis_service
from app.services.forecast_service import forecast_service
from app.services.llm_service import llm_service
from app.services.news_service import news_service

router = APIRouter(tags=["Analysis"])


class NarrativeRequest(BaseModel):
    dataset_name: Optional[str] = None
    symbol: Optional[str] = None
    target_col: Optional[str] = None
    horizon: int = 7


class NarrativeResponse(BaseModel):
    symbol_or_dataset: str
    source: str
    sentiment_considered: Optional[str]
    narrative: str


@router.get("/data/summary", response_model=DataSummaryResponse)
def get_data_summary(
    market_id: Optional[str] = Query(None, description="Market identifier or dataset name"),
    dataset: Optional[str] = Query(None, description="Dataset filename or symbol"),
    symbol: Optional[str] = Query(None, description="Alias for dataset"),
    target_col: Optional[str] = Query(None, description="Target column to analyze"),
    target: Optional[str] = Query(None, description="Alias for target column"),
):
    """
    Returns descriptive statistics, missing value audit, outlier detection, and trend metrics.
    """
    resolved_dataset = market_id or dataset or symbol
    resolved_target = target_col or target
    try:
        summary = analysis_service.generate_data_summary(
            dataset_name=resolved_dataset,
            target_col=resolved_target,
        )
        payload = summary.model_dump()
        payload["dataset"] = payload.get("dataset_name") or resolved_dataset
        payload["symbol"] = symbol or resolved_dataset or payload.get("dataset_name")
        payload["target"] = resolved_target or payload.get("target_column")
        start_d = payload.get("date_range", {}).get("start_date")
        end_d = payload.get("date_range", {}).get("end_date")
        payload["start_date"] = start_d
        payload["end_date"] = end_d
        payload["startDate"] = start_d
        payload["endDate"] = end_d
        payload["datasetName"] = payload.get("dataset_name") or resolved_dataset
        payload["rowCount"] = payload.get("row_count")
        payload["features"] = payload.get("columns", [])
        
        # Missing values map
        mv_raw = payload.get("missing_values", [])
        if isinstance(mv_raw, list):
            payload["missingValues"] = {item.get("column", ""): item.get("missing_count", 0) for item in mv_raw if isinstance(item, dict)}
        else:
            payload["missingValues"] = {}

        # Statistics map
        stats_map = {}
        if payload.get("descriptive_statistics"):
            for col, col_stat in payload["descriptive_statistics"].items():
                if isinstance(col_stat, dict):
                    stats_map[col] = {
                        "mean": col_stat.get("mean"),
                        "median": col_stat.get("median"),
                        "min": col_stat.get("min"),
                        "max": col_stat.get("max"),
                        "stdDev": col_stat.get("std"),
                    }
        payload["statistics"] = stats_map

        if payload.get("descriptive_statistics") and payload.get("target_column"):
            target_metric = payload["descriptive_statistics"].get(payload["target_column"], {})
            payload["mean"] = target_metric.get("mean")
            payload["median"] = target_metric.get("median")
            payload["standard_deviation"] = target_metric.get("std")
            target_series = payload.get("chart_preview", [])
            if target_series:
                payload["latest_value"] = target_series[-1].get("value")
                payload["previous_value"] = target_series[-2].get("value") if len(target_series) > 1 else target_series[-1].get("value")
        payload["data_is_synthetic"] = payload.get("is_synthetic")
        return payload
    except DataIngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate dataset summary.")


@router.post("/analysis/narrative", response_model=NarrativeResponse)
async def generate_market_narrative(request: NarrativeRequest):
    """
    Synthesizes an executive market brief and forecast narrative using Google Gemini AI,
    incorporating statistical trend metrics, multi-step predictions, and news sentiment.
    """
    target_item = request.dataset_name or request.symbol or "synthetic_market_data.csv"
    try:
        # 1. Obtain statistical summary
        summary = analysis_service.generate_data_summary(dataset_name=target_item, target_col=request.target_col)
        trend_dict = summary.trend_summary.model_dump()

        # 2. Obtain forecasts
        forecast_res = forecast_service.generate_forecast(
            ForecastRequest(dataset_name=target_item, horizon=request.horizon, model_type="ridge")
        )
        forecast_pts = [pt.model_dump() for pt in forecast_res.forecasts]

        # 3. Obtain sentiment from news if possible
        sentiment_verdict = "Neutral"
        try:
            news_res = await news_service.get_market_news(query=target_item.replace(".csv", "").replace("_stock_daily", ""), limit=5)
            sentiment_verdict = news_res.sentiment.verdict
        except Exception:
            pass

        # 4. Generate narrative with LLM service
        res = await llm_service.generate_market_narrative(
            symbol_or_dataset=target_item,
            trend_summary=trend_dict,
            forecast_points=forecast_pts,
            sentiment_verdict=sentiment_verdict,
        )

        return NarrativeResponse(
            symbol_or_dataset=res["symbol_or_dataset"],
            source=res["source"],
            sentiment_considered=res.get("sentiment_considered"),
            narrative=res["narrative"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate narrative: {str(e)}")


@router.get("/analysis/technical")
def get_technical_analysis(
    symbol: Optional[str] = Query(None, description="Instrument symbol (e.g. NIFTY50, INDIAVIX)"),
    market_id: Optional[str] = Query(None, description="Market identifier or dataset filename"),
    dataset: Optional[str] = Query(None, description="Alias for dataset name"),
    interval: str = Query("1d", description="Observation interval"),
):
    """
    Returns full technical indicator suite (Moving Averages, RSI, MACD, Bollinger Bands, ATR),
    support/resistance levels, multi-period returns, and regime classification for NIFTY 50.
    """
    from app.services.technical_service import technical_service

    target_symbol = symbol or market_id or dataset
    try:
        res = technical_service.calculate_technical_analysis(
            symbol=target_symbol,
            dataset_name=target_symbol,
            interval=interval,
        )
        return res
    except DataIngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute technical analysis: {str(e)}")

