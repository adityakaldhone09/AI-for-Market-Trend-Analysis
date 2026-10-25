from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.data.loaders.public_api_loader import public_api_loader
from app.schemas.market import MarketDatasetMetadata, MarketListResponse
from app.services.data_service import data_service

router = APIRouter(tags=["Markets"])


@router.get("/markets", response_model=MarketListResponse)
def list_markets():
    """Returns available market datasets, instruments, and canonical metadata."""
    datasets = data_service.get_available_datasets()
    compat_markets = []
    for ds in datasets:
        symbol = ds.symbol or (ds.dataset_name.replace(".csv", "") if ds.dataset_name else "market")
        symbol = symbol.replace("_stock_daily", "").replace("_daily", "").replace("_data", "")
        compat_markets.append(
            MarketDatasetMetadata(
                dataset_name=ds.dataset_name,
                symbol=symbol,
                name=ds.name or symbol.upper(),
                exchange=ds.exchange or "NSE",
                currency=ds.currency or "INR",
                description=ds.description or f"Market dataset for {symbol}",
                source=ds.source,
                is_synthetic=ds.is_synthetic,
                retrieval_time=ds.retrieval_time,
                row_count=ds.row_count,
                date_range=ds.date_range,
                columns=ds.columns,
                default_target=ds.default_target,
                numeric_columns=ds.numeric_columns,
            )
        )
    return MarketListResponse(
        total_datasets=len(datasets),
        datasets=datasets,
        markets=compat_markets,
    )


@router.post("/markets/sync", response_model=MarketDatasetMetadata)
async def sync_market_symbol(
    symbol: str = Query(..., description="Stock symbol to fetch and cache (e.g. IBM, AAPL, MSFT)"),
):
    """
    Fetches real-time / historical daily stock data from configured provider (Alpha Vantage)
    and caches it into datasets/raw as canonical CSV.
    """
    try:
        df, meta = await public_api_loader.sync_and_cache_symbol(symbol)
        return MarketDatasetMetadata(
            dataset_name=meta["dataset_name"],
            source=meta["source"],
            is_synthetic=meta["is_synthetic"],
            retrieval_time=meta["retrieval_time"],
            row_count=meta["row_count"],
            date_range=meta["date_range"],
            columns=meta["columns"],
            default_target=meta["default_target"],
            numeric_columns=meta["numeric_columns"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Market sync failed for '{symbol}': {str(e)}")
