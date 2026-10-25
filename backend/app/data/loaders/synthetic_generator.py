from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd
from app.core.config import settings
from app.core.logging import logger


def generate_synthetic_stock_data(
    n_days: int = 500,
    start_date: str = "2024-01-01",
    initial_price: float = 150.0,
    drift: float = 0.08,
    volatility: float = 0.22,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generates a realistic synthetic financial time series using Geometric Brownian Motion (GBM).
    Marked explicitly as synthetic in metadata.
    """
    np.random.seed(seed)
    dt = 1 / 252  # daily trading interval
    mu = drift
    sigma = volatility

    # Generate daily returns
    random_shocks = np.random.normal(0, 1, n_days)
    daily_returns = np.exp((mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * random_shocks)

    prices = np.zeros(n_days)
    prices[0] = initial_price
    for t in range(1, n_days):
        prices[t] = prices[t - 1] * daily_returns[t]

    dates = [pd.to_datetime(start_date) + timedelta(days=i) for i in range(n_days)]

    # Generate realistic Open, High, Low, Close, Volume
    opens = np.zeros(n_days)
    highs = np.zeros(n_days)
    lows = np.zeros(n_days)
    closes = prices
    volumes = np.zeros(n_days, dtype=int)

    for i in range(n_days):
        c = closes[i]
        o = closes[i - 1] * (1 + np.random.normal(0, 0.004)) if i > 0 else c
        intra_high = max(o, c) * (1 + abs(np.random.normal(0, 0.008)))
        intra_low = min(o, c) * (1 - abs(np.random.normal(0, 0.008)))
        vol = int(np.random.lognormal(mean=14.5, sigma=0.5))

        opens[i] = round(o, 2)
        highs[i] = round(intra_high, 2)
        lows[i] = round(intra_low, 2)
        volumes[i] = vol

    df = pd.DataFrame({
        "timestamp": [d.strftime("%Y-%m-%d") for d in dates],
        "open": opens,
        "high": highs,
        "low": lows,
        "close": [round(c, 2) for c in closes],
        "volume": volumes,
        "target_value": [round(c, 2) for c in closes],
    })

    return df


def ensure_default_datasets(datasets_dir: Optional[Path] = None) -> Path:
    """Creates the default benchmark synthetic dataset if not already present."""
    base_dir = (datasets_dir or settings.datasets_path).resolve()
    raw_dir = base_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    target_file = raw_dir / "synthetic_market_data.csv"
    if not target_file.exists():
        logger.info(f"Generating default synthetic market dataset at {target_file}")
        df = generate_synthetic_stock_data(n_days=500, start_date="2024-01-01", seed=42)
        df.to_csv(target_file, index=False)

    return target_file
