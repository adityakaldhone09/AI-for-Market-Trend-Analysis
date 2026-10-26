# Frontend ↔ FastAPI API Contract

This document specifies the exact REST API contract between the **FastAPI backend** (`http://localhost:8000/api/v1`) and the **Vite + React frontend** (`frontend/artifacts/market-trend-analysis`). The backend and frontend adapter (`frontend/.../service.ts`) are fully synchronized to support both canonical Pydantic structures and camelCase/convenience aliases.

---

## 1. Root & System Health

### `GET /health` and `GET /api/v1/health`
Checks server liveness, operational status, and server time.

**Response (HTTP 200)**:
```json
{
  "status": "healthy",
  "service": "AI Market Trend Analysis API",
  "version": "1.0.0",
  "timestamp": "2026-10-25T18:50:00Z"
}
```

---

## 2. Market Catalog

### `GET /api/v1/markets`
Returns the list of available market datasets (cached CSVs and synced assets).

**Response (HTTP 200)**:
```json
{
  "total_datasets": 3,
  "datasets": [
    {
      "dataset_name": "ibm_stock_daily.csv",
      "symbol": "IBM",
      "source": "alpha_vantage",
      "description": "Daily adjusted market quotes for IBM",
      "is_synthetic": false
    }
  ],
  "markets": [
    {
      "id": "ibm_stock_daily.csv",
      "name": "IBM Daily (Real)",
      "symbol": "IBM",
      "currency": "USD",
      "source": "alpha_vantage",
      "is_synthetic": false
    }
  ]
}
```
*Frontend Normalizer Note*: The frontend unwraps `.markets` (or `.datasets`), mapping `id = dataset_name`, while keeping `symbol`, `name`, `currency`, and `is_synthetic`.

---

## 3. Market Historical Observations

### `GET /api/v1/market-data`
Returns chronological observations for the requested dataset.

**Query Parameters**:
- `market_id` (or `dataset`, `symbol`): e.g. `ibm_stock_daily.csv` or `IBM`
- `start_date` *(optional)*: `YYYY-MM-DD`
- `end_date` *(optional)*: `YYYY-MM-DD`
- `page` *(optional)*: integer, default `1`
- `page_size` / `limit` *(optional)*: integer, default `100`

**Response (HTTP 200)**:
```json
{
  "dataset": "ibm_stock_daily.csv",
  "symbol": "IBM",
  "total_records": 100,
  "page": 1,
  "page_size": 100,
  "total_pages": 1,
  "data": [
    {
      "timestamp": "2026-09-01",
      "open": 180.25,
      "high": 182.10,
      "low": 179.80,
      "close": 181.50,
      "volume": 3200000,
      "target_value": 181.50
    }
  ]
}
```
*Frontend Normalizer Note*: Unwraps `.data` and maps `timestamp` to `date`, and `close` / `target_value` to `value`.

---

## 4. Exploratory Data Analysis & Summary

### `GET /api/v1/data/summary`
Calculates descriptive statistics, IQR outlier statistics, and missing value profiles.

**Query Parameters**:
- `market_id` (or `dataset`, `symbol`)
- `target_col` *(optional)*: e.g. `close`

**Response (HTTP 200)**:
```json
{
  "datasetName": "ibm_stock_daily.csv",
  "dataset_name": "ibm_stock_daily.csv",
  "rowCount": 250,
  "row_count": 250,
  "startDate": "2025-10-25",
  "endDate": "2026-10-25",
  "missingValues": 0,
  "missing_values_count": 0,
  "data_is_synthetic": false,
  "is_synthetic": false,
  "statistics": {
    "mean": 175.42,
    "median": 176.10,
    "standard_deviation": 8.65,
    "min": 155.20,
    "max": 192.80,
    "iqr_outliers": 0
  },
  "descriptive_statistics": {
    "target_value": {
      "mean": 175.42,
      "std": 8.65,
      "min": 155.20,
      "25%": 170.10,
      "50%": 176.10,
      "75%": 181.40,
      "max": 192.80
    }
  }
}
```

---

## 5. Model Catalog

### `GET /api/v1/models`
Returns registered forecasting models and readiness status.

**Response (HTTP 200)**:
```json
{
  "total_models": 3,
  "models": [
    {
      "id": "baseline_naive",
      "model_id": "baseline_naive",
      "key": "baseline_naive",
      "name": "Naïve Persistence Baseline",
      "model_family": "baseline",
      "readiness_status": "ready",
      "status": "ready",
      "description": "Predicts future periods using the most recent observation."
    },
    {
      "id": "ridge",
      "model_id": "ridge",
      "key": "ridge",
      "name": "Ridge Regression",
      "model_family": "linear_regularized",
      "readiness_status": "ready",
      "status": "ready",
      "description": "L2-regularized linear model trained on multi-lag autoregressive features."
    }
  ]
}
```

---

## 6. Multi-Step Forecasting

### `POST /api/v1/forecasts`
Generates recursive multi-step forecasts with empirical confidence bounds.

**Request Body**:
```json
{
  "market_id": "ibm_stock_daily.csv",
  "model_id": "ridge",
  "horizon": 7,
  "target_col": "close"
}
```
*(Accepts both `market_id` / `model_id` and `dataset_name` / `model_type`)*

**Response (HTTP 200)**:
```json
{
  "marketId": "ibm_stock_daily.csv",
  "modelName": "ridge",
  "modelVersion": "1.0.0",
  "createdAt": "2026-10-25T18:50:00Z",
  "data_is_synthetic": false,
  "values": [
    {
      "date": "2026-10-26",
      "predicted": 182.10,
      "upper": 184.50,
      "lower": 179.70
    }
  ],
  "forecasts": [
    {
      "step": 1,
      "timestamp": "2026-10-26",
      "predicted_value": 182.10,
      "lower_bound": 179.70,
      "upper_bound": 184.50
    }
  ]
}
```
*Authenticity Guarantee*: Does **not** return fake `{"mae": 0.0, "rmse": 0.0}` metrics. Real evaluation metrics are provided exclusively through the `/api/v1/evaluations` endpoint.

---

## 7. Model Evaluation & Benchmarking

### `POST /api/v1/evaluations`
Performs chronological holdout evaluation without data leakage, comparing against the Naïve persistence baseline.

**Request Body**:
```json
{
  "market_id": "ibm_stock_daily.csv",
  "model_id": "ridge",
  "test_ratio": 0.2
}
```

**Response (HTTP 200)**:
```json
{
  "model": "ridge",
  "target_col": "target_value",
  "metrics": {
    "mae": 1.85,
    "rmse": 2.40,
    "mse": 5.76,
    "r2": 0.78,
    "mape": 1.05,
    "directional_accuracy": 56.4
  },
  "period": {
    "start": "2026-08-01",
    "end": "2026-10-25"
  },
  "data_is_synthetic": false,
  "values": [
    {
      "date": "2026-08-01",
      "actual": 178.50,
      "predicted": 177.90
    }
  ],
  "baseline_comparison": {
    "baseline_model": "baseline_naive",
    "baseline_mae": 2.10,
    "mae_reduction_pct": 11.9
  }
}
```

---

## 8. Technical Analysis & Regime Detection

### `GET /api/v1/analysis/technical`
Computes institutional-grade technical indicators, returns across multiple horizons, standard pivot points, and detects market regime.

**Query Parameters**:
- `symbol` *(optional)*: `NIFTY50` (default)
- `interval` *(optional)*: `1d` (default)

**Response (HTTP 200)**:
```json
{
  "symbol": "NIFTY50",
  "interval": "1d",
  "latest_timestamp": "2026-10-26",
  "latest_close": 24750.50,
  "regime": "uptrend",
  "regime_confidence": 0.78,
  "regime_summary": "Price is above SMA 50 and SMA 200 with bullish momentum.",
  "moving_averages": {
    "sma_20": 24650.0,
    "sma_50": 24420.0,
    "sma_200": 23900.0,
    "ema_12": 24710.0,
    "ema_26": 24580.0
  },
  "indicators": {
    "rsi_14": 58.4,
    "macd": 65.2,
    "macd_signal": 48.1,
    "macd_histogram": 17.1,
    "bollinger_upper": 25100.0,
    "bollinger_middle": 24650.0,
    "bollinger_lower": 24200.0,
    "atr_14": 185.0,
    "rolling_volatility_20": 13.8
  },
  "pivot_points": {
    "p": 24720.0,
    "r1": 24850.0,
    "r2": 24980.0,
    "r3": 25150.0,
    "s1": 24600.0,
    "s2": 24480.0,
    "s3": 24320.0
  },
  "returns": {
    "daily_return_pct": 0.42,
    "weekly_return_pct": 1.15,
    "monthly_return_pct": 2.80,
    "ytd_return_pct": 11.25
  },
  "volume_note": "Benchmark index OHLC record. Calculated index benchmark does not possess traded share volume."
}
```

---

## 9. Full NIFTY 50 Context: Market Breadth & Sectors

### `GET /api/v1/market-breadth`
Computes constituent advances/declines, moving average participation breadth (% above 20/50/200 SMA), and top weighted contributors.

**Response (HTTP 200)**:
```json
{
  "timestamp": "2026-10-26",
  "advancing_count": 32,
  "declining_count": 16,
  "unchanged_count": 2,
  "advance_decline_ratio": 2.0,
  "pct_above_20_sma": 68.0,
  "pct_above_50_sma": 74.0,
  "pct_above_200_sma": 82.0,
  "top_gainers": [
    { "symbol": "RELIANCE", "change_pct": 2.1, "close": 2980.0, "weight_pct": 10.2 }
  ],
  "top_losers": [
    { "symbol": "INFY", "change_pct": -1.2, "close": 1780.0, "weight_pct": 6.8 }
  ],
  "total_constituents": 50,
  "tracked_constituents": 20
}
```

### `GET /api/v1/sectors/performance`
Compares official NSE sector indices (NIFTY Bank, NIFTY IT, NIFTY Auto, FMCG, Pharma) against benchmark NIFTY 50.

**Response (HTTP 200)**:
```json
{
  "timestamp": "2026-10-26",
  "benchmark_return_1d": 0.42,
  "benchmark_return_1w": 1.15,
  "benchmark_return_1m": 2.80,
  "sectors": [
    {
      "sector_name": "NIFTY Bank",
      "symbol": "NIFTYBANK",
      "close": 52100.0,
      "return_1d": 0.85,
      "return_1w": 2.10,
      "return_1m": 3.40,
      "relative_strength_1m": 0.60
    }
  ]
}
```

---

## 10. Explainable Research Signals

### `POST /api/v1/signals` and `GET /api/v1/signals/latest`
Generates a multi-factor quantitative research signal with explicit invalidation levels, decision rules, and confidence breakdown.

**Request Body** *(optional on POST)*:
```json
{
  "symbol": "NIFTY50",
  "horizon_sessions": 1
}
```

**Response (HTTP 200)**:
```json
{
  "symbol": "NIFTY50",
  "timestamp": "2026-10-26",
  "signal": "BULLISH",
  "action": "LONG",
  "confidence": 0.72,
  "time_horizon": "1 session",
  "target_level": 24950.0,
  "invalidation_level": 24580.0,
  "rationale": "Bullish trend confirmed by price above 50/200 SMA and positive MACD histogram.",
  "factors": [
    {
      "name": "Moving Average Alignment",
      "reading": "Above 20/50/200 SMA",
      "bias": "bullish",
      "weight": 0.35,
      "detail": "Price 24750 > SMA50 24420"
    }
  ],
  "market_regime": "uptrend",
  "data_cutoff": "2026-10-26",
  "disclaimer": "Research decision support signal only. Not personalized financial advice or execution order under SEBI regulations."
}
```

---

## 11. Strategy Backtesting Engine

### `POST /api/v1/backtests`
Simulates quantitative trading rules on chronological index bars with zero lookahead, next-bar execution, fees, and slippage.

**Request Body**:
```json
{
  "symbol": "NIFTY50",
  "strategy_type": "trend_following",
  "initial_capital": 1000000.0,
  "fee_rate": 0.0003,
  "slippage_rate": 0.0002,
  "sma_fast": 20,
  "sma_slow": 50,
  "rsi_period": 14,
  "rsi_oversold": 30.0,
  "rsi_overbought": 70.0
}
```

---

## 12. Paper Trading Simulation

Runs simulated portfolio accounting against real historical or delayed feeds with ₹1,000,000 INR starting capital without transmitting real broker orders.

- `GET /api/v1/paper-trading/account`: Returns cash, equity, open positions, unrealized P&L, orders, and simulator state.
- `POST /api/v1/paper-trading/order`: Submits a virtual market order (`BUY` or `SELL`).
- `POST /api/v1/paper-trading/close-position`: Closes an existing virtual position at the current market price.
- `POST /api/v1/paper-trading/reset`: Resets the paper trading account back to ₹1,000,000 starting cash.
- `POST /api/v1/paper-trading/toggle`: Pauses or resumes the paper trading simulator.

---

## 13. News Sentiment & Narrative Generation

### `GET /api/v1/news?query=NIFTY50&limit=10`
Returns live financial news and polarity sentiment. Gracefully degrades if external API keys are omitted.

### `POST /api/v1/analysis/narrative`
Generates executive trend commentary using Google Gemini AI, with algorithmic fallback when unconfigured.

---

## 14. Regulatory Boundaries & Compliance Safeguards

- **Research Signal & Decision Support**: Outputs generated by this platform are automated quantitative research models, not personalized advisory services or guaranteed investment recommendations under SEBI (Research Analysts) Regulations, 2014 or SEBI (Investment Advisers) Regulations, 2013.
- **SEBI Retail Algo Framework**: Live automated order routing is strictly disabled by default. In accordance with SEBI circulars on retail algorithmic trading (dated 4 February 2025 and 30 September 2025 extension), broker execution requires specific broker approvals, conformance testing, and regulatory compliance.
- **No Client Secrets in Frontend**: Dhan, Alpha Vantage, and Gemini keys remain strictly in `backend/.env`.
