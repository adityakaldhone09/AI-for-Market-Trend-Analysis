import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from httpx import ASGITransport, AsyncClient
from fastapi.testclient import TestClient

# Add project root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app


@pytest.fixture
def client():
    """Synchronous TestClient for FastAPI endpoints."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_clean_df():
    """Generates a clean 100-day chronological dataframe."""
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    prices = 100.0 + np.cumsum(np.random.normal(0.1, 1.0, 100))
    return pd.DataFrame({
        "timestamp": dates.strftime("%Y-%m-%d"),
        "open": prices - 0.5,
        "high": prices + 1.0,
        "low": prices - 1.0,
        "close": prices,
        "volume": np.random.randint(100000, 500000, 100),
        "target_value": prices,
    })


@pytest.fixture
def sample_dirty_csv(tmp_path):
    """Creates a temporary CSV with duplicates, missing values, and unsorted dates."""
    p = tmp_path / "dirty_data.csv"
    content = (
        "Date,Close,Volume\n"
        "2024-01-05,105.0,1000\n"
        "2024-01-02,102.0,2000\n"
        "2024-01-02,102.5,2100\n"  # duplicate
        "2024-01-03,,3000\n"       # missing target
        "2024-01-01,100.0,1500\n"
        "2024-01-04,104.0,2500\n"
    )
    p.write_text(content)
    return p
