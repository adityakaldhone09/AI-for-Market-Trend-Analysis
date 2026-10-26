import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_nifty50_technical_analysis():
    response = client.get("/api/v1/analysis/technical?symbol=NIFTY50")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "NIFTY50"
    assert "latest_close" in data
    assert data["latest_close"] > 0
    assert "indicators" in data
    assert "sma_20" in data["indicators"]
    assert "rsi_14" in data["indicators"]
    assert "macd_line" in data["indicators"]
    assert "support_resistance" in data
    assert "pivot_point" in data["support_resistance"]
    assert "regime" in data
    assert data["regime"]["regime"] in ["uptrend", "downtrend", "sideways", "high-volatility", "insufficient-data"]
    assert len(data["observations"]) > 0


def test_market_breadth_endpoint():
    response = client.get("/api/v1/market-breadth")
    assert response.status_code == 200
    data = response.json()
    assert "advances" in data
    assert "declines" in data
    assert "pct_above_sma50" in data
    assert "top_gainers" in data
    assert "top_losers" in data
    assert data["total_constituents"] > 0


def test_sectors_performance_endpoint():
    response = client.get("/api/v1/sectors/performance")
    assert response.status_code == 200
    data = response.json()
    assert data["benchmark_symbol"] == "NIFTY50"
    assert "sectors" in data
    assert len(data["sectors"]) > 0
    assert data["vix_context"] is not None
    assert data["vix_context"]["symbol"] == "INDIAVIX"


def test_research_signal_endpoint():
    payload = {
        "symbol": "NIFTY50",
        "horizon_days": 5,
        "risk_tolerance": "balanced",
    }
    response = client.post("/api/v1/signals", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "NIFTY50"
    assert data["signal"] in ["BULLISH_OUTLOOK", "BEARISH_OUTLOOK", "NEUTRAL_RANGE"]
    assert data["stance"] in ["LONG_BIAS", "SHORT_BIAS", "FLAT_WAIT"]
    assert "invalidation_level" in data
    assert "primary_factors" in data
    assert len(data["primary_factors"]) >= 3
    assert "SEBI" in data["disclaimer"]


def test_strategy_backtest_endpoint():
    payload = {
        "symbol": "NIFTY50",
        "strategy_type": "trend_following",
        "initial_capital": 1000000.0,
        "transaction_cost_pct": 0.05,
        "fast_ma_period": 20,
        "slow_ma_period": 50,
    }
    response = client.post("/api/v1/backtests", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "NIFTY50"
    assert "metrics" in data
    assert "total_return_pct" in data["metrics"]
    assert "sharpe_ratio" in data["metrics"]
    assert "max_drawdown_pct" in data["metrics"]
    assert len(data["equity_curve"]) > 0


def test_paper_trading_workflow():
    # 1. Reset account
    r_reset = client.post("/api/v1/paper-trading/reset")
    assert r_reset.status_code == 200
    acc = r_reset.json()
    assert acc["cash_balance"] == 1000000.0
    assert acc["positions_count"] == 0

    # 2. Place BUY order
    buy_order = {
        "symbol": "NIFTY50",
        "side": "BUY",
        "quantity": 10,
        "order_type": "MARKET",
    }
    r_buy = client.post("/api/v1/paper-trading/order", json=buy_order)
    assert r_buy.status_code == 200
    order_data = r_buy.json()
    assert order_data["status"] == "FILLED"
    assert order_data["side"] == "BUY"

    # 3. Check Account Summary has 1 position
    r_acc = client.get("/api/v1/paper-trading/account")
    assert r_acc.status_code == 200
    acc_after = r_acc.json()
    assert acc_after["positions_count"] == 1
    assert acc_after["cash_balance"] < 1000000.0

    # 4. Close position
    r_close = client.post("/api/v1/paper-trading/close-position", json={"symbol": "NIFTY50"})
    assert r_close.status_code == 200
    close_data = r_close.json()
    assert close_data["status"] == "FILLED"
    assert close_data["side"] == "SELL"

    # 5. Confirm position closed
    r_final = client.get("/api/v1/paper-trading/account")
    assert r_final.status_code == 200
    assert r_final.json()["positions_count"] == 0


def test_invalid_symbol_rejects_without_silent_fallback():
    response = client.get("/api/v1/analysis/technical?symbol=NON_EXISTENT_TICKER_XYZ")
    assert response.status_code == 400
