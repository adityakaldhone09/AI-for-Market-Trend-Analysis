# Frontend ↔ FastAPI API Contract

The frontend uses a flexible response normalizer, but the most reliable integration is to return the canonical shapes below. Root health is `/health`; the rest use `/api/v1`.

## 1. GET /health

```json
{
  "status": "healthy",
  "service": "market-trend-backend",
  "version": "1.0.0"
}
```

## 2. GET /api/v1/markets

```json
{
  "markets": [
    {
      "symbol": "NIFTY50",
      "name": "NIFTY 50",
      "exchange": "NSE",
      "currency": "INR",
      "description": "Historical index time series"
    }
  ]
}
```

Each item needs a `symbol` (or `ticker`, `dataset`, `id`) and may also include `name`, `exchange`, `currency`, and `description`.

## 3. GET /api/v1/market-data

Query parameters sent by the frontend:
- `symbol`
- `dataset`
- `start_date` (`YYYY-MM-DD`)
- `end_date` (`YYYY-MM-DD`)
- `limit` (currently `500`)

Canonical response:

```json
{
  "data": [
    {
      "timestamp": "2026-09-01",
      "open": 24750.0,
      "high": 24820.0,
      "low": 24680.0,
      "close": 24790.0,
      "volume": 123456
    }
  ]
}
```

The normalizer also accepts `date`, `datetime`, or `time` instead of `timestamp`, and `price`, `value`, or `target` instead of `close`.

## 4. GET /api/v1/data/summary?symbol=...&dataset=...`

```json
{
  "dataset": "NIFTY50",
  "row_count": 500,
  "start_date": "2026-07-01",
  "end_date": "2026-09-01",
  "missing_values": 0,
  "features": ["timestamp", "open", "high", "low", "close", "volume"],
  "mean": 24620.4,
  "median": 24680.0,
  "standard_deviation": 310.5,
  "latest_value": 24790.0,
  "previous_value": 24740.0,
  "data_is_synthetic": false
}
```

## 5. GET /api/v1/models

```json
{
  "models": [
    {
      "key": "naive_baseline",
      "name": "Naive baseline",
      "type": "Baseline",
      "status": "ready",
      "description": "Forecasts the next value using the last observed value."
    }
  ]
}
```

## 6. POST /api/v1/forecasts

Request:

```json
{
  "symbol": "NIFTY50",
  "dataset": "NIFTY50",
  "target": "close",
  "horizon": 10,
  "model": "naive_baseline"
}
```

Response:

```json
{
  "symbol": "NIFTY50",
  "target": "close",
  "model": "naive_baseline",
  "horizon": 10,
  "frequency": "business-day",
  "generated_at": "2026-10-25T10:00:00Z",
  "data_is_synthetic": false,
  "predictions": [
    { "timestamp": "2026-10-26", "value": 24805.0 },
    { "timestamp": "2026-10-27", "value": 24811.0, "lower": 24720.0, "upper": 24900.0 }
  ],
  "evaluation": { "mae": 45.2, "rmse": 61.7 }
}
```

## 7. POST /api/v1/evaluations

Request:

```json
{
  "symbol": "NIFTY50",
  "dataset": "NIFTY50",
  "target": "close",
  "model": "naive_baseline"
}
```

Response:

```json
{
  "model": "naive_baseline",
  "target": "close",
  "mae": 45.2,
  "rmse": 61.7,
  "mse": 3806.89,
  "r2": 0.81,
  "test_period": {
    "start": "2026-09-01",
    "end": "2026-10-01"
  },
  "data_is_synthetic": false
}
```

## CORS and secret handling

Allow the local frontend origin during development:

```python
allow_origins=["http://localhost:5173"]
```

Keep provider keys on the backend. Never put third-party credentials in frontend environment variables.
