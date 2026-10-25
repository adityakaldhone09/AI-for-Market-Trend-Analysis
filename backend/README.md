# Market Trend Analysis Backend

A production-grade, modular Python FastAPI backend and Machine Learning service for market trend analysis, time-series forecasting, and financial dataset profiling.

Built with clean separation between API routing, service logic, data engineering, and machine learning pipelines. Engineered with strict zero-lookahead chronological validation to eliminate data leakage.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Directory Structure](#project-directory-structure)
3. [Quickstart & Setup](#quickstart--setup)
4. [Running the Application](#running-the-application)
5. [Running Tests](#running-tests)
6. [API Specification & Frontend Contract](#api-specification--frontend-contract)
7. [Data Ingestion & Canonical Format](#data-ingestion--canonical-format)
8. [EDA & Preprocessing Pipeline](#eda--preprocessing-pipeline)
9. [Forecasting Models & Leakage Prevention](#forecasting-models--leakage-prevention)
10. [Completed Features & Verified Commands](#completed-features--verified-commands)
11. [Known Limitations & Next Steps](#known-limitations--next-steps)

---

## 1. Architecture Overview

```text
       React Frontend (e.g., http://localhost:3000, 5173)
                             │
                             ▼  REST JSON API (CORS enabled)
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Application (app.main)              │
│  ├── /health                                                │
│  └── /api/v1/                                               │
│       ├── markets        (Available datasets & catalog)     │
│       ├── market-data    (Paginated chronological records)  │
│       ├── data/summary   (EDA, descriptive stats, outliers) │
│       ├── models         (Model catalog & readiness)        │
│       ├── forecasts      (Multi-step inference & bounds)    │
│       ├── evaluations    (Chronological holdout benchmark)  │
│       ├── news           (Live financial news & sentiment)  │
│       └── narrative      (AI/Gemini market trend brief)     │
└────────────────────────────┬────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│       Service Layer       │     │     Machine Learning      │
│  ├── data_service         │     │  ├── baseline (Naive,SMA) │
│  ├── preprocessing_service│     │  ├── features (Zero-leak) │
│  ├── analysis_service     │     │  ├── train (Scaler split) │
│  ├── forecast_service     │     │  ├── predict (Multistep)  │
│  └── evaluation_service   │     │  └── evaluate (Holdout)   │
└───────────┬───────────────┘     └───────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│     datasets/ (Raw/Proc)  │     │   artifacts/ (Joblib/JSON)│
│  ├── aapl_stock_daily.csv │     │  ├── *.joblib models      │
│  └── synthetic_market.csv │     │  └── *_metadata.json      │
└───────────────────────────┘     └───────────────────────────┘
```

---

## 2. Project Directory Structure

```text
backend/
├── app/
│   ├── main.py                     # FastAPI entrypoint, CORS, lifespan
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings & env resolution
│   │   └── logging.py              # Structured logging configuration
│   ├── api/
│   │   └── routes/
│   │       ├── health.py           # GET /health & GET /api/v1/health
│   │       ├── markets.py          # GET /api/v1/markets
│   │       ├── market_data.py      # GET /api/v1/market-data
│   │       ├── analysis.py         # GET /api/v1/data/summary
│   │       ├── forecasts.py        # POST /api/v1/forecasts
│   │       ├── models.py           # GET /api/v1/models
│   │       └── evaluations.py      # POST /api/v1/evaluations
│   ├── schemas/
│   │   ├── market.py               # Pydantic schemas for data & catalog
│   │   ├── analysis.py             # Schemas for EDA, outliers, trends
│   │   └── forecast.py             # Schemas for forecasts & evaluations
│   ├── services/
│   │   ├── data_service.py         # Cataloging & paginated queries
│   │   ├── preprocessing_service.py# Cleaning & auditing service
│   │   ├── analysis_service.py     # EDA, stats, trend metrics
│   │   ├── forecast_service.py     # Forecasting inference dispatcher
│   │   └── evaluation_service.py   # Benchmark evaluation engine
│   ├── data/
│   │   ├── loaders/
│   │   │   ├── csv_loader.py       # Safe path loader & validation
│   │   │   ├── synthetic_generator.py # Geometric Brownian Motion generator
│   │   │   └── public_api_loader.py # Optional public provider client
│   │   └── preprocessing/
│   │       └── cleaner.py          # IQR outlier detection & audit logger
│   └── ml/
│       ├── features.py             # Leak-free lags & rolling windows
│       ├── baseline.py             # Naive persistence & SMA models
│       ├── train.py                # Scikit-learn estimator training
│       ├── predict.py              # Multi-step forecasting engine
│       └── evaluate.py             # MAE, RMSE, MSE, R2, Direction Acc
├── datasets/
│   ├── raw/                        # Initial raw CSV datasets
│   └── processed/                  # Processed datasets
├── artifacts/                      # Serialized models & metadata (.joblib, .json)
├── tests/                          # 29 Pytest unit & integration tests
│   ├── conftest.py
│   ├── test_health.py
│   ├── test_data_loader.py
│   ├── test_preprocessing_and_eda.py
│   ├── test_feature_engineering_no_leakage.py
│   ├── test_baseline_models.py
│   ├── test_ml_pipeline.py
│   └── test_api_endpoints.py
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 3. Quickstart & Setup

### Prerequisites
- Python 3.11+ (verified compatible up to Python 3.13)
- macOS, Linux, or Windows WSL

### Installation

```bash
cd backend

# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
```

---

## 4. Running the Application

Start the development server with Uvicorn:

```bash
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Documentation (ReDoc): `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/health`

---

## 5. Running Tests

Run the complete test suite with pytest:

```bash
PYTHONPATH=. pytest tests -v
```

All 29 tests validate health endpoints, safe path ingestion, duplicate timestamp handling, zero-leakage feature engineering, chronological splits, baseline models, scikit-learn models, and REST endpoints.

---

## 6. API Specification & Frontend Contract

All endpoints except the root `/health` are prefixed with `/api/v1`.

### 6.1 `GET /health` and `GET /api/v1/health`
Checks backend liveness and version.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "AI Market Trend Analysis API",
  "version": "1.0.0",
  "timestamp": "2026-10-25T11:07:18.535041Z"
}
```

---

### 6.2 `GET /api/v1/markets`
Retrieves available market datasets and metadata.

**Response (200 OK):**
```json
{
  "total_datasets": 2,
  "datasets": [
    {
      "dataset_name": "aapl_stock_daily.csv",
      "source": "csv_ingestion",
      "is_synthetic": false,
      "retrieval_time": "2026-10-25T11:07:18.547053Z",
      "row_count": 500,
      "date_range": {
        "start_date": "2023-01-01",
        "end_date": "2024-05-14"
      },
      "columns": ["timestamp", "open", "high", "low", "close", "volume", "target_value"],
      "default_target": "close",
      "numeric_columns": ["open", "high", "low", "close", "volume", "target_value"]
    }
  ]
}
```

---

### 6.3 `GET /api/v1/market-data`
Returns chronologically ordered observations with pagination and date filtering.

**Query Parameters:**
- `dataset` (string, optional): Dataset filename (e.g. `aapl_stock_daily.csv`)
- `start_date` (string, optional): Filter from date `YYYY-MM-DD`
- `end_date` (string, optional): Filter to date `YYYY-MM-DD`
- `page` (integer, default `1`): Current page
- `page_size` (integer, default `100`, max `1000`): Records per page

**Example Request:**
```bash
curl -s "http://127.0.0.1:8000/api/v1/market-data?dataset=synthetic_market_data.csv&page=1&page_size=2"
```

**Response (200 OK):**
```json
{
  "dataset_name": "synthetic_market_data.csv",
  "target_col": "close",
  "total_records": 500,
  "page": 1,
  "page_size": 2,
  "total_pages": 250,
  "data": [
    {
      "timestamp": "2023-01-01",
      "target_value": 100.0,
      "open": 100.0,
      "high": 100.74,
      "low": 98.47,
      "close": 100.0,
      "volume": 985314.0,
      "units_sold": null,
      "product_price": null,
      "additional_features": null
    }
  ]
}
```

---

### 6.4 `GET /api/v1/data/summary`
Performs automated Exploratory Data Analysis (EDA) on the dataset:
- Missing value audit
- Numeric descriptive statistics (mean, std, min, 25%, median, 75%, max, skewness, kurtosis)
- Statistical outlier detection via Interquartile Range (IQR) rule
- Trend metrics: net change, percentage change, direction, annualized volatility, 7-day & 30-day moving averages
- 60-day chart preview with SMA overlays

**Example Request:**
```bash
curl -s "http://127.0.0.1:8000/api/v1/data/summary?dataset=synthetic_market_data.csv"
```

---

### 6.5 `GET /api/v1/models`
Returns list of available models and readiness status.

**Response (200 OK):**
```json
{
  "total_models": 4,
  "models": [
    {
      "model_id": "baseline_naive",
      "name": "Naïve Persistence Baseline",
      "model_type": "baseline",
      "version": "1.0.0",
      "readiness_status": "ready",
      "description": "Predicts that future values will remain equal to the most recent historical observation.",
      "parameters": {"horizon_range": "1-60 days"}
    },
    {
      "model_id": "baseline_sma",
      "name": "Simple Moving Average Baseline",
      "model_type": "baseline",
      "version": "1.0.0",
      "readiness_status": "ready",
      "description": "Rolls forward autoregressively using the average of the last k observations.",
      "parameters": {"window_default": 5, "window_range": "2-30"}
    },
    {
      "model_id": "linear_regression",
      "name": "Linear Regression with Lag Features",
      "model_type": "regression",
      "version": "1.0.0",
      "readiness_status": "ready",
      "description": "Scikit-learn ordinary least squares regression trained on leakage-free lags and rolling stats.",
      "parameters": {"lags": [1, 2, 3, 5, 7], "rolling_windows": [3, 7, 14]}
    },
    {
      "model_id": "ridge",
      "name": "Ridge Regression (L2 Regularized)",
      "model_type": "regression",
      "version": "1.0.0",
      "readiness_status": "ready",
      "description": "L2 regularized linear model preventing overfitting on collinear financial lag features.",
      "parameters": {"alpha": 1.0, "lags": [1, 2, 3, 5, 7], "rolling_windows": [3, 7, 14]}
    }
  ]
}
```

---

### 6.6 `POST /api/v1/forecasts`
Generates multi-step future forecasts with uncertainty bounds.

**Request Body:**
```json
{
  "dataset_name": "synthetic_market_data.csv",
  "target_col": "close",
  "horizon": 7,
  "model_type": "ridge",
  "sma_window": 5
}
```

**Response (200 OK):**
```json
{
  "model_name": "Scikit-learn Ridge",
  "model_version": "v_20261025_110718",
  "dataset_name": "synthetic_market_data.csv",
  "target_col": "close",
  "horizon": 7,
  "is_synthetic": true,
  "last_historical_timestamp": "2024-05-14",
  "last_historical_value": 116.3,
  "forecasts": [
    {
      "step": 1,
      "timestamp": "2024-05-15",
      "predicted_value": 118.69,
      "lower_bound": 115.1,
      "upper_bound": 122.28
    },
    {
      "step": 2,
      "timestamp": "2024-05-16",
      "predicted_value": 120.12,
      "lower_bound": 115.04,
      "upper_bound": 125.2
    }
  ],
  "training_context": {
    "dataset_rows": 500,
    "model_id": "ridge_synthetic_market_data_v_20261025_110718",
    "metrics": {
      "mae": 1.4957,
      "rmse": 1.8331,
      "mse": 3.3604,
      "r2": 0.8842,
      "mape": 1.34,
      "direction_accuracy": 54.17
    }
  },
  "disclaimer": "Forecasts are generated by a numerical machine learning prototype for informational purposes only. Not financial or investment advice."
}
```

---

### 6.7 `POST /api/v1/evaluations`
Evaluates candidate models against the Naïve Persistence Baseline on a strictly held-out chronological test set.

**Request Body:**
```json
{
  "dataset_name": "synthetic_market_data.csv",
  "target_col": "close",
  "model_type": "ridge",
  "test_ratio": 0.2
}
```

**Response (200 OK):**
```json
{
  "model_id": "ridge_synthetic_market_data_v_20261025_110718",
  "model_name": "Scikit-learn Ridge",
  "dataset_name": "synthetic_market_data.csv",
  "target_col": "close",
  "horizon": 1,
  "train_date_range": {
    "start_date": "2023-01-15",
    "end_date": "2024-02-07"
  },
  "test_date_range": {
    "start_date": "2024-02-08",
    "end_date": "2024-05-14"
  },
  "train_samples": 389,
  "test_samples": 97,
  "metrics": {
    "mae": 1.4957,
    "rmse": 1.8331,
    "mse": 3.3604,
    "r2": 0.8842,
    "mape": 1.34,
    "direction_accuracy": 54.17
  },
  "baseline_naive_metrics": {
    "mae": 1.7601,
    "rmse": 2.2272,
    "mse": 4.9605,
    "r2": 0.8291,
    "mape": 1.58,
    "direction_accuracy": 50.0
  },
  "performance_improvement_pct": {
    "mae_reduction_pct": 15.02,
    "rmse_reduction_pct": 17.69,
    "mse_reduction_pct": 32.26,
    "direction_accuracy_gain_pct": 4.17
  },
  "evaluation_timestamp": "2026-10-25T11:07:18.892410Z"
}
```

---

## 7. Data Ingestion & Canonical Format

The data layer supports arbitrary chronological tabular datasets through a standardized canonical format:

| Column | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `timestamp` | `datetime` or `ISO-8601 string` | **Required** | Chronological index |
| `target_value` | `float` | **Required** | Primary numerical forecasting target |
| `open` | `float` | Optional | Period opening price |
| `high` | `float` | Optional | Period high |
| `low` | `float` | Optional | Period low |
| `close` | `float` | Optional | Period close |
| `volume` | `float` / `int` | Optional | Traded volume or demand |
| `units_sold` | `float` / `int` | Optional | E-commerce demand volume |
| `product_price` | `float` | Optional | E-commerce unit price |

### Ingestion Safety Rules
1. **Path Isolation**: Directory traversal patterns (`..`, `/`, `\`) are strictly blocked. Files must reside within `datasets/raw/` or `datasets/processed/`.
2. **Duplicate Timestamps**: Cleaned according to documented policy (default: `keep_last`, logged in audit).
3. **Synthetic Identification**: Simulated datasets are stamped `is_synthetic: true` in metadata and API responses.
4. **Credential Isolation**: External providers fetch via environment variable `EXTERNAL_DATA_API_KEY`. No API keys are hardcoded.

---

## 8. EDA & Preprocessing Pipeline

- **Audited Cleaning**: Missing values in the target are causal forward-filled (`ffill().bfill()`) so past records never look ahead to future values. All imputations are recorded in the audit log.
- **Outlier Policy**: Outliers are flagged using the Interquartile Range rule ($[Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR]$). Observations are **not silently dropped**, preserving genuine market shocks.
- **Descriptive Statistics**: Robust calculations for mean, standard deviation, percentiles, skewness, and kurtosis.

---

## 9. Forecasting Models & Leakage Prevention

### Zero-Leakage Architecture
To guarantee production-grade statistical validity:
1. **Chronological Splitting**: Train and test datasets are partitioned strictly by date without random shuffling.
2. **Scaler Isolation**: `StandardScaler` is fitted **only on the training split** and applied to test and inference features.
3. **Lag & Rolling Features**:
   - Lag features: $y_{t-1}, y_{t-2}, \dots, y_{t-7}$
   - Rolling features: strictly shifted by 1 ($shift(1).rolling(w)$) so value at time $t$ has zero knowledge of observation $t$.
4. **Artifact Management**: Models are persisted using `joblib` alongside JSON metadata capturing training timestamps, feature schemas, and residual error standard deviations.

---

## 10. Completed Features & Verified Commands

| Feature | Status | Verification Command |
| :--- | :--- | :--- |
| **Virtual Environment & Dependencies** | Completed | `.venv/bin/pip list` |
| **FastAPI REST API Structure** | Completed | `curl http://127.0.0.1:8000/health` |
| **Safe CSV Data Loader** | Completed | `pytest tests/test_data_loader.py` |
| **EDA & Outlier Profiler** | Completed | `pytest tests/test_preprocessing_and_eda.py` |
| **Zero-Leakage Feature Pipeline** | Completed | `pytest tests/test_feature_engineering_no_leakage.py` |
| **Naïve & SMA Baseline Models** | Completed | `pytest tests/test_baseline_models.py` |
| **Scikit-Learn ML Models (Ridge/OLS)** | Completed | `pytest tests/test_ml_pipeline.py` |
| **REST Endpoints & Integration** | Completed | `pytest tests/test_api_endpoints.py` |
| **Artifact Management & JSON Meta** | Completed | Verified in `backend/artifacts/` |
| **Full Pytest Suite (29 tests)** | **29/29 Passed** | `PYTHONPATH=. pytest tests -v` |

---

## 11. Known Limitations & Next Steps

1. **Current Scope**: Focuses on univariate price/target forecasting with lag and rolling autoregression. Exogenous macroeconomic variables (interest rates, sentiment) can be attached to `additional_features`.
2. **Model Horizon**: Multi-step recursive rollout is implemented. For longer horizons (>30 days), direct multi-output models or conformal prediction bands can provide tighter error bounds.
3. **LSTM Extension (Next Phase)**:
   - Build 3D sliding window tensors $(N, \text{window\_size}, \text{n\_features})$
   - Train a PyTorch/Keras LSTM cell comparing holdout metrics against the established Ridge and Naïve baselines.
4. **Frontend Integration**:
   - The React frontend can directly consume `/api/v1/markets`, `/api/v1/market-data`, `/api/v1/data/summary`, `/api/v1/forecasts`, and `/api/v1/evaluations`. CORS is preconfigured for Vite (`5173`) and CRA/Next (`3000`).
