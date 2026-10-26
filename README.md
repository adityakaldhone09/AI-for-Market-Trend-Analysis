# NIFTY 50 AI Market Intelligence, Forecasting and Strategy Research Platform

[![Python](https://img.shields.io/badge/Python-3.11%20|%203.12%20|%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.1+-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3+-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An institutional-grade financial-market analytics and quantitative-research platform engineered for the **Indian equity market**, focused on the **NIFTY 50** benchmark index (`^NSEI`), **India VIX** (`^INDIAVIX`), and official NSE sector indices. Features a high-performance **Python/FastAPI** backend with zero-lookahead ML pipelines, coupled with an interactive **Vite + React + TypeScript** dashboard with high-contrast tech aesthetics.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Capabilities](#key-capabilities)
- [Regulatory Boundaries & Compliance Notice](#regulatory-boundaries--compliance-notice)
- [Repository Structure](#repository-structure)
- [Quickstart Guide](#quickstart-guide)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Dataset Provenance & Benchmark Volume Integrity](#dataset-provenance--benchmark-volume-integrity)
- [REST API Specification](#rest-api-specification)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [License](#license)

---

## Architecture Overview

```text
       Browser / Client (Desktop & Mobile)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│       Frontend: Vite + React + TypeScript (Port 5173)       │
│  ├── 1. Overview & NIFTY 50 Interactive OHLC Candlestick    │
│  ├── 2. Technical Analysis (20/50/200 SMA, RSI, MACD, ATR) │
│  ├── 3. Market Breadth (Advances/Declines, % > SMAs) & VIX  │
│  ├── 4. Time-Series Forecasting (1-day & 5-day Horizons)    │
│  ├── 5. Explainable Research Signals (Transparent factors)  │
│  ├── 6. Quantitative Strategy Backtest Engine (Next-bar)    │
│  └── 7. Virtual Paper Trading Simulator (₹10 Lakh Capital)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼  REST JSON API (CORS enabled)
┌─────────────────────────────────────────────────────────────┐
│             Backend: FastAPI Service (Port 8000)            │
│  ├── /health & /api/v1/health (Liveness checks)             │
│  ├── /api/v1/markets & /api/v1/market-data (NIFTY 50 OHLC)  │
│  ├── /api/v1/analysis/technical (Moving averages & regime)  │
│  ├── /api/v1/market-breadth & /api/v1/sectors/performance   │
│  ├── /api/v1/models, /api/v1/forecasts, /api/v1/evaluations │
│  ├── /api/v1/signals & /api/v1/signals/latest               │
│  ├── /api/v1/backtests (Zero-lookahead next-bar simulation) │
│  └── /api/v1/paper-trading/* (Simulated orders & accounts)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│   Data & Canonical CSVs   │         │  Model Artifacts & Cache  │
│  ├── nifty50_daily.csv    │         │  ├── *.joblib models      │
│  ├── india_vix_daily.csv  │         │  │   (Naive, Ridge, RF)   │
│  ├── sector indices CSVs  │         │  └── *_metadata.json      │
│  └── constituents CSV     │         └───────────────────────────┘
└───────────────────────────┘
```

---

## Key Capabilities

1. **Robust Data Ingestion & Live Synchronization**:
   - Safe CSV loader with path isolation (prevents path traversal attacks).
   - Live historical stock data fetching via **Alpha Vantage** and **Twelve Data** API integrations (`POST /api/v1/markets/sync?symbol=...`).
   - Standardized canonical time-series format (`timestamp`, `target_value`, `open`, `high`, `low`, `close`, `volume`).
   - Automated duplicate timestamp handling (`keep_last`, `mean`, or strict rejection) and chronological ordering.

2. **Exploratory Data Analysis (EDA) & Outlier Profiling**:
   - Comprehensive descriptive statistics: `mean`, `std`, `min`, `25%`, `median`, `75%`, `max`, `skewness`, `kurtosis`.
   - Statistical outlier detection via the Interquartile Range (**IQR**) rule ($Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR$) without discarding valid market volatility events.
   - Trend indicators: Net price change, percentage return, annualized volatility, 7-day and 30-day moving averages.
   - Forward-imputation (`ffill`) strictly eliminating future lookahead leakage.

3. **Zero-Leakage Feature Engineering & Modeling**:
   - **Strict Chronological Splitting**: Train/validation/holdout test splits are partitioned purely by time order without random shuffling.
   - **Feature Hygiene**: Lags ($t-1, \dots, t-7$) and rolling statistics are calculated on shifted values (`shift(1).rolling(w)`), ensuring observation at time $t$ has zero knowledge of current or future observations.
   - **Scaler Isolation**: `StandardScaler` is fitted strictly on the training partition only.
   - **Forecasting Models**:
     - *Naïve Persistence Baseline* ($y_{t+h} = y_t$).
     - *Simple Moving Average (SMA)* baseline.
     - *Regularized Ridge Regression* with multi-step recursive rollout.
   - **Prediction Uncertainty**: Empirical confidence bounds computed using validation residual error variance.
   - **Artifact Persistence**: Models and metadata saved into `backend/artifacts/*.joblib` and `backend/artifacts/*_metadata.json`.

4. **Live News Sentiment & AI Market Narratives**:
   - Real-time financial press aggregation via **GNews** and **NewsAPI** with keyword sentiment polarity scoring.
   - Graceful offline degradation: when news API keys are absent, the service reports offline status instead of failing core data operations.
   - Executive market brief synthesis powered by **Google Gemini AI** with algorithmic quantitative fallback.

5. **Modern, Responsive Frontend Dashboard**:
   - Interactive Recharts time-series charts with forecast extensions and confidence bands.
   - Operating mode switch: Seamlessly switch between live API mode and standalone offline demo mode.

---

## Repository Structure

```text
AI-for-Market-Trend-Analysis/
├── backend/                                # FastAPI application & ML engine
│   ├── app/
│   │   ├── main.py                         # Application entrypoint & CORS middleware
│   │   ├── core/
│   │   │   ├── config.py                   # Pydantic BaseSettings & .env resolution
│   │   │   └── logging.py                  # Structured application logging
│   │   ├── api/
│   │   │   └── routes/                     # REST route controllers
│   │   │       ├── health.py               # GET /health & /api/v1/health
│   │   │       ├── markets.py              # GET /markets & POST /markets/sync
│   │   │       ├── market_data.py          # GET /market-data
│   │   │       ├── analysis.py             # GET /data/summary & POST /analysis/narrative
│   │   │       ├── forecasts.py            # POST /forecasts
│   │   │       ├── models.py               # GET /models
│   │   │       ├── evaluations.py          # POST /evaluations
│   │   │       └── news.py                 # GET /news
│   │   ├── schemas/                        # Pydantic request/response contracts
│   │   ├── services/                       # Business logic & orchestrators
│   │   ├── data/
│   │   │   ├── loaders/                    # CSV, Alpha Vantage & Synthetic generators
│   │   │   └── preprocessing/              # DataCleaner & IQR outlier detection
│   │   └── ml/                             # Features, Baselines, Training, Prediction
│   ├── datasets/                           # Raw and processed CSV datasets
│   │   └── raw/                            # Stock CSVs and companion *.meta.json files
│   ├── artifacts/                          # Serialized models and metadata
│   ├── tests/                              # Pytest test suite (38 passing tests)
│   ├── requirements.txt                    # Pinned Python dependencies
│   ├── .env.example                        # Template for backend environment variables
│   └── README.md                           # Detailed backend documentation
│
├── frontend/                               # Frontend workspace
│   ├── artifacts/
│   │   └── market-trend-analysis/          # Active Vite + React + TypeScript app
│   │       ├── src/
│   │       │   ├── pages/                  # Dashboard, Analysis, Forecast, Explorer, Eval
│   │       │   ├── components/             # Reusable UI & Layout components
│   │       │   ├── features/market/        # API client, types, normalizers & mock data
│   │       │   └── test/                   # Vitest unit & integration tests
│   │       ├── package.json
│   │       ├── vite.config.ts
│   │       └── .env.example
│   ├── package.json                        # Root frontend workspace config
│   └── pnpm-workspace.yaml
│
├── docs/                                   # Architectural specifications & contracts
│   ├── ARCHITECTURE.md                     # System design & responsibilities
│   └── API_CONTRACT.md                     # Comprehensive Frontend ↔ Backend contract
│
├── .gitignore
└── README.md                               # Root project documentation
```

---

## Quickstart Guide

### 1. Backend Setup

**Prerequisites**: Python 3.11, 3.12, or 3.13.

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys (Alpha Vantage, GNews, Gemini, etc.)

# Run tests (38 passing tests including contract verification)
PYTHONPATH=. pytest tests -v

# Start development server
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be live at:
- **API Base**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

---

### 2. Frontend Setup

**Prerequisites**: Node.js 18+ and `pnpm`.

```bash
cd frontend

# Install workspace dependencies
pnpm install

# Navigate to the active application
cd artifacts/market-trend-analysis

# Configure frontend environment
cp .env.example .env

# Run type checking and tests
pnpm run typecheck
pnpm run test

# Launch frontend development server
pnpm run dev
```

The application dashboard will be live at `http://localhost:5173`.

---

## Operating Modes

The frontend operates in two distinct modes controlled by the `VITE_DATA_MODE` variable:

1. **Live API Mode (`VITE_DATA_MODE=api`)** *(Recommended)*:
   - Queries the local FastAPI backend at `http://localhost:8000/api/v1`.
   - Uses real market datasets (`ibm_stock_daily.csv`), live Alpha Vantage synchronizations, and genuine ML predictions.
   - If the backend is disconnected, the UI explicitly displays a connection alert banner rather than masquerading fake numbers as real data.

2. **Demo Mode (`VITE_DATA_MODE=demo`)**:
   - Operates in standalone mode using bundled illustrative sample datasets.
   - Useful for testing UI components and mock views in environments where Python or the FastAPI server is not installed.
   - Forecast generation displays an informative disclaimer explaining that live backend mode is required for predictive modeling.

---

## Dataset Provenance & Metric Integrity

### Provenance Tracking (`*.meta.json`)
Every dataset in `backend/datasets/raw/` includes a companion JSON metadata file:
- **`ibm_stock_daily.csv`**: Marked `is_synthetic: false` (sourced from Alpha Vantage daily adjusted quotes).
- **`aapl_stock_daily.csv`**: Marked `is_synthetic: true` (simulated baseline benchmark).
- **`synthetic_market_data.csv`**: Marked `is_synthetic: true` (geometrically generated sample).

The UI and backend truthfully propagate this provenance badge across all pages.

### Zero Fabricated Metrics Guarantee
Unlike systems that display static `0.0` or fake accuracy numbers, the forecasting endpoint (`POST /api/v1/forecasts`) does not fabricate MAE/RMSE metrics. Measured accuracy metrics are computed exclusively on chronologically held-out test partitions via `POST /api/v1/evaluations`.

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Service title | `"AI Market Trend Analysis API"` |
| `API_V1_PREFIX` | Versioned route prefix | `"/api/v1"` |
| `HOST` / `PORT` | Server bind host & port | `0.0.0.0` / `8000` |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `'["http://localhost:3000", "http://localhost:5173"]'` |
| `DATASETS_DIR` | Relative/absolute datasets path | `"datasets"` |
| `ARTIFACTS_DIR` | Relative/absolute artifacts path | `"artifacts"` |
| `DEFAULT_DATASET` | Fallback active dataset | `"ibm_stock_daily.csv"` |
| `DATA_PROVIDER` | Active market data provider | `"alpha_vantage"` |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key | *(Your key)* |
| `TWELVE_DATA_API_KEY` | Twelve Data API key | *(Optional)* |
| `NEWS_PROVIDER` | Active news provider | `"gnews"` |
| `GNEWS_API_KEY` | GNews API key | *(Optional)* |
| `NEWSAPI_API_KEY` | NewsAPI key | *(Optional)* |
| `GEMINI_API_KEY` | Google Gemini AI key | *(Optional)* |

> **Security Note**: Never commit `backend/.env` to source control. Provider credentials must stay strictly in the backend environment.

### Frontend Configuration (`frontend/artifacts/market-trend-analysis/.env`)

| Variable | Description | Setting |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for FastAPI backend | `http://localhost:8000/api/v1` |
| `VITE_DATA_MODE` | Active operational mode | `api` (or `demo` for offline test) |

---

## REST API Specification

All data endpoints are prefixed with `/api/v1` (except the root `/health`). Both backend-native snake_case and frontend camelCase parameter aliases (`market_id`, `model_id`) are supported.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server status, service name, version, and UTC timestamp |
| `GET` | `/api/v1/markets` | Catalog of available datasets, symbols, and provenance flags |
| `POST` | `/api/v1/markets/sync` | Fetches & caches live daily stock quotes via Alpha Vantage (`?symbol=IBM`) |
| `GET` | `/api/v1/market-data` | Paginated chronological observations (`?market_id=...&page=1&page_size=100`) |
| `GET` | `/api/v1/data/summary` | Descriptive statistics, IQR outlier audit, and trend indicators |
| `GET` | `/api/v1/models` | Catalog of forecasting models (`baseline_naive`, `baseline_sma`, `ridge`) |
| `POST` | `/api/v1/forecasts` | Multi-step recursive forecasting with empirical uncertainty bounds |
| `POST` | `/api/v1/evaluations` | Zero-leakage chronological holdout validation vs. Naïve Baseline |
| `GET` | `/api/v1/news` | Live financial news headlines and sentiment scoring (`?query=IBM`) |
| `POST` | `/api/v1/analysis/narrative` | Executive AI market brief with quantitative algorithmic fallback |

For full request/response schemas and examples, see [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## Testing & Quality Assurance

### Backend Tests (Pytest)
```bash
cd backend
.venv/bin/pytest tests -v
```
- **38 passed tests** covering:
  - System health and CORS headers.
  - Safe CSV loading and path traversal rejection.
  - Duplicate timestamp handling and chronological sorting.
  - Zero-lookahead feature generation and scaler isolation.
  - Baseline and Ridge regression training and inference.
  - Graceful news/LLM degradation without external API keys.
  - Complete Frontend ↔ Backend integration contracts (`test_frontend_contract.py`).

### Frontend Tests (Vitest & TypeScript)
```bash
cd frontend/artifacts/market-trend-analysis
pnpm run typecheck    # TypeScript strict validation
pnpm run test         # Vitest unit & integration tests (7 tests)
pnpm run build        # Production bundle compilation
```

---

## Modeling & Zero-Leakage Principles

1. **Chronological Splitting**: Samples are partitioned strictly by time order ($T_{\text{train}} < T_{\text{val}} < T_{\text{test}}$). Shuffling is strictly disallowed.
2. **Scaler Isolation**: `StandardScaler` is fitted exclusively on historical training samples; test and inference observations are transformed without recalculating distribution parameters.
3. **Autoregressive Feature Engineering**:
   - Lag features: $y_{t-1}, y_{t-2}, \dots, y_{t-7}$.
   - Rolling features: strictly shifted by 1 (`shift(1).rolling(w)`) so observation $t$ does not incorporate $y_t$.
4. **Baseline Benchmarking**: Every evaluation reports performance gains relative to a Naïve Persistence Baseline ($y_{t+h} = y_t$) over the identical target and evaluation window.

---

## Documentation Links

- [Backend Documentation](backend/README.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Frontend ↔ Backend API Contract](docs/API_CONTRACT.md)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.