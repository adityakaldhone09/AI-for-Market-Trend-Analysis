from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import httpx
import numpy as np
import pandas as pd
from app.core.config import settings
from app.core.logging import logger


class PublicAPIDataLoader:
    """
    Connects to external market data providers (Alpha Vantage, Twelve Data) using .env API keys.
    Converts external payloads into canonical dataset format and caches them locally.
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        alpha_vantage_key: Optional[str] = None,
        twelve_data_key: Optional[str] = None,
        output_dir: Optional[Path] = None,
    ):
        self.provider = (provider or settings.DATA_PROVIDER or "alpha_vantage").lower()
        self.alpha_vantage_key = alpha_vantage_key or settings.ALPHA_VANTAGE_API_KEY
        self.twelve_data_key = twelve_data_key or settings.TWELVE_DATA_API_KEY
        self.output_dir = (output_dir or (settings.datasets_path / "raw")).resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def fetch_alpha_vantage(self, symbol: str) -> pd.DataFrame:
        """Fetches daily time series from Alpha Vantage and parses to canonical format."""
        if not self.alpha_vantage_key:
            raise ValueError("ALPHA_VANTAGE_API_KEY is not configured in .env.")

        url = (
            f"https://www.alphavantage.co/query?"
            f"function=TIME_SERIES_DAILY&symbol={symbol}&outputsize=compact&apikey={self.alpha_vantage_key}"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        if "Error Message" in data:
            raise ValueError(f"Alpha Vantage error for '{symbol}': {data['Error Message']}")
        if "Information" in data and "rate limit" in data["Information"].lower():
            raise ValueError(f"Alpha Vantage rate limit reached: {data['Information']}")
        if "Time Series (Daily)" not in data:
            raise ValueError(f"Unexpected response from Alpha Vantage for '{symbol}': {data}")

        ts_data = data["Time Series (Daily)"]
        records = []
        for dt_str, quotes in ts_data.items():
            records.append({
                "timestamp": dt_str,
                "open": round(float(quotes["1. open"]), 2),
                "high": round(float(quotes["2. high"]), 2),
                "low": round(float(quotes["3. low"]), 2),
                "close": round(float(quotes["4. close"]), 2),
                "volume": int(float(quotes["5. volume"])),
                "target_value": round(float(quotes["4. close"]), 2),
            })

        df = pd.DataFrame(records)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        return df

    async def fetch_twelve_data(self, symbol: str) -> pd.DataFrame:
        """Fetches daily time series from Twelve Data."""
        if not self.twelve_data_key:
            raise ValueError("TWELVE_DATA_API_KEY is not configured in .env.")

        url = (
            f"https://api.twelvedata.com/time_series?"
            f"symbol={symbol}&interval=1day&outputsize=100&apikey={self.twelve_data_key}"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") == "error":
            raise ValueError(f"Twelve Data error: {data.get('message')}")

        values = data.get("values", [])
        if not values:
            raise ValueError(f"No price values returned by Twelve Data for '{symbol}'")

        records = []
        for item in values:
            records.append({
                "timestamp": item["datetime"],
                "open": round(float(item["open"]), 2),
                "high": round(float(item["high"]), 2),
                "low": round(float(item["low"]), 2),
                "close": round(float(item["close"]), 2),
                "volume": int(float(item.get("volume", 0))),
                "target_value": round(float(item["close"]), 2),
            })

        df = pd.DataFrame(records)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        return df

    async def sync_and_cache_symbol(self, symbol: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Fetches live data from the active provider, writes to datasets/raw,
        and returns the canonical DataFrame and metadata.
        """
        symbol_clean = symbol.strip().upper()
        logger.info(f"Syncing live market data for symbol '{symbol_clean}' using {self.provider}")

        if self.provider == "twelve_data" or (not self.alpha_vantage_key and self.twelve_data_key):
            df = await self.fetch_twelve_data(symbol_clean)
            provider_used = "Twelve Data"
        else:
            df = await self.fetch_alpha_vantage(symbol_clean)
            provider_used = "Alpha Vantage"

        filename = f"{symbol_clean.lower()}_stock_daily.csv"
        file_path = self.output_dir / filename

        # Format timestamps cleanly before saving
        save_df = df.copy()
        save_df["timestamp"] = save_df["timestamp"].dt.strftime("%Y-%m-%d")
        save_df.to_csv(file_path, index=False)
        logger.info(f"Saved {len(save_df)} rows for '{symbol_clean}' to {file_path}")

        metadata = {
            "dataset_name": filename,
            "symbol": symbol_clean,
            "filepath": str(file_path),
            "source": f"live_api_{provider_used.lower().replace(' ', '_')}",
            "is_synthetic": False,
            "retrieval_time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "row_count": len(save_df),
            "date_range": {
                "start_date": str(save_df["timestamp"].iloc[0]),
                "end_date": str(save_df["timestamp"].iloc[-1]),
            },
            "columns": list(save_df.columns),
            "default_target": "close",
            "numeric_columns": [c for c in save_df.select_dtypes(include=[np.number]).columns],
        }

        return df, metadata


public_api_loader = PublicAPIDataLoader()
