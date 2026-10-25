# AI for Market Trend Analysis

[![Python](https://img.shields.io/badge/Python-3.11%20|%203.12%20|%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.1+-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3+-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An intelligent, full-stack market trend analysis and time-series forecasting platform. Features a high-performance **Python/FastAPI** backend with leak-free machine learning pipelines, coupled with an interactive **Vite + React + TypeScript** dashboard for data exploration, technical analysis, and multi-step forecast visualization.

---

## Architecture Overview

```text
       Browser / Client (Desktop & Mobile)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│       Frontend: Vite + React + TypeScript (Port 5173)       │
│  ├── Executive Dashboard & Market Summary Cards             │
│  ├── Market Technical Analysis (SMA-7, SMA-30, Volatility)  │
│  ├── Interactive Multi-Step Forecasting with Bounds         │
│  ├── Data Explorer (Pagination, Date Filters, IQR Outliers) │
│  └── Model Evaluation Benchmarking vs. Naïve Baseline       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼  REST JSON API (CORS enabled)
┌─────────────────────────────────────────────────────────────┐
│             Backend: FastAPI Service (Port 8000)            │
│  ├── /health & /api/v1/health                               │
│  ├── /api/v1/markets & /api/v1/markets/sync (Alpha Vantage) │
│  ├── /api/v1/market-data (Paginated canonical records)      │
│  ├── /api/v1/data/summary (EDA, descriptive stats, IQR)     │
│  ├── /api/v1/models (Catalog & readiness)                   │
│  ├── /api/v1/forecasts (Multi-step inference + uncertainty) │
│  ├── /api/v1/evaluations (Chronological holdout validation) │
│  ├── /api/v1/news (Live GNews & sentiment polarity scoring) │
│  └── /api/v1/analysis/narrative (Gemini AI market brief)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│   Data & Local Storage    │         │  Model Artifacts & Cache  │
│  ├── datasets/raw/        │         │  ├── *.joblib models      │
│  └── datasets/processed/  │         │  └── *_metadata.json      │
└───────────────────────────┘         └───────────────────────────┘
```

---

## Key Capabilities

1. **Robust Data Ingestion & Live Synchronization**:
   - Safe CSV loader with path isolation (prevents path traversal attacks).
   - Live historical stock data fetching via **Alpha Vantage** and **Twelve Data** API integrations (`POST /api/v1/markets/sync?symbol=...`).
   - Standardized canonical time-series format (`timestamp`, `target_value`, `open`, `high`, `low`, `close`, `volume`).
   - Duplicate timestamp handling and chronological sorting.

2. **Exploratory Data Analysis (EDA) & Outlier Profiling**:
   - Descriptive statistics: `mean`, `std`, `min`, `25%`, `median`, `75%`, `max`, `skewness`, `kurtosis`.
   - Statistical outlier detection via the Interquartile Range (**IQR**) rule ($Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR$) without discarding valid market volatility events.
   - Trend indicators: Net price change, percentage return, annualized volatility, 7-day and 30-day moving averages.
   - Audited missing value forward-imputation (`ffill`) strictly eliminating future lookahead leakage.

3. **Zero-Leakage Feature Engineering & Modeling**:
   - **Strict Chronological Splitting**: Train/validation/holdout test splits are partitioned purely by time order without random shuffling.
   - **Feature Hygiene**: Lags ($t-1, \dots, t-7$) and rolling statistics are calculated on shifted values (`shift(1).rolling(w)`), ensuring observation at time $t$ has zero knowledge of current or future observations.
   - **Scaler Isolation**: `StandardScaler` is fitted strictly on the training partition only.
   - **Forecasting Models**:
     - *Naïve Persistence Baseline* ($y_{t+h} = y_t$).
     - *Simple Moving Average (SMA)* baseline.
     - *Regularized Ridge Regression* & *Ordinary Least Squares (OLS)* with multi-step recursive rollout.
   - **Prediction Uncertainty**: Empirical confidence bounds computed using validation residual error variance.
   - **Artifact Persistence**: Models and metadata saved into `backend/artifacts/*.joblib` and `backend/artifacts/*_metadata.json`.

4. **Live News Sentiment & AI Market Narratives**:
   - Real-time financial press aggregation via **GNews** and **NewsAPI** with keyword sentiment polarity scoring.
   - Executive market brief synthesis powered by **Google Gemini AI** with algorithmic quantitative fallback.

5. **Modern, Responsive Frontend Dashboard**:
   - Interactive Recharts time-series charts with forecast extensions and confidence bands.
   - Live vs. Demo mode fallback: seamlessly handles offline operation or missing live backend services.

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
│   ├── artifacts/                          # Serialized models and metadata
│   ├── tests/                              # Pytest test suite (31 tests)
│   ├── requirements.txt                    # Pinned Python dependencies
│   ├── .env.example                        # Template for environment variables
│   └── README.md                           # Detailed backend documentation
│
├── frontend/                               # Frontend workspace
│   ├── artifacts/
│   │   └── market-trend-analysis/          # Active Vite + React + TypeScript app
│   │       ├── src/
│   │       │   ├── pages/                  # Dashboard, Analysis, Forecast, Explorer, Eval
│   │       │   ├── components/             # Reusable UI & Layout components
│   │       │   ├── features/market/        # API client, types, normalizers & mock data
│   │       │   └── test/                   # Vitest tests
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

# Run tests (31 passing tests)
PYTHONPATH=. pytest tests -v

# Start development server
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be live at:
- **API Base**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
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
# Ensure VITE_API_BASE_URL=http://localhost:8000/api/v1 and VITE_DATA_MODE=api

# Run typecheck and tests
pnpm run typecheck
pnpm run test

# Launch frontend development server
pnpm run dev
```

The application will be live at `http://localhost:5173`.

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Service title | `"AI Market Trend Analysis API"` |
| `API_V1_PREFIX` | Versioned route prefix | `"/api/v1"` |
| `HOST` / `PORT` | Server bind host & port | `0.0.0.0` / `8000` |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `'["http://localhost:3000", "http://localhost:5173"]'` |
| `CORS_ORIGINS` | Additional CORS origins | `http://localhost:5173` |
| `DATASETS_DIR` | Relative/absolute datasets path | `"datasets"` |
| `ARTIFACTS_DIR` | Relative/absolute artifacts path | `"artifacts"` |
| `DEFAULT_DATASET` | Fallback active dataset | `"aapl_stock_daily.csv"` |
| `DATA_PROVIDER` | Active market data provider | `"alpha_vantage"` or `"twelve_data"` |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key | *(Your key)* |
| `TWELVE_DATA_API_KEY` | Twelve Data API key | *(Optional)* |
| `NEWS_PROVIDER` | Active news provider | `"gnews"` or `"newsapi"` |
| `GNEWS_API_KEY` | GNews API key | *(Your key)* |
| `NEWSAPI_API_KEY` | NewsAPI key | *(Optional)* |
| `GEMINI_API_KEY` | Google Gemini AI key | *(Your key)* |

### Frontend Configuration (`frontend/artifacts/market-trend-analysis/.env`)

| Variable | Description | Recommended Setting |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for the FastAPI backend | `http://localhost:8000/api/v1` |
| `VITE_DATA_MODE` | Operating mode (`api` or `demo`) | `api` (falls back to demo if offline) |

---

## API Specification

All data endpoints are prefixed with `/api/v1` (except the root `/health`).

### Core Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Application status, version, and server timestamp |
| `GET` | `/api/v1/markets` | Catalog of available datasets, symbols, and metadata |
| `POST` | `/api/v1/markets/sync` | Fetches & caches live daily stock quotes via Alpha Vantage (`?symbol=IBM`) |
| `GET` | `/api/v1/market-data` | Paginated chronological observations (`?dataset=...&page=1&page_size=100`) |
| `GET` | `/api/v1/data/summary` | Descriptive statistics, IQR outlier audit, and trend indicators |
| `GET` | `/api/v1/models` | Available model metadata (`baseline_naive`, `baseline_sma`, `ridge`, etc.) |
| `POST` | `/api/v1/forecasts` | Multi-step forecasting with confidence bounds |
| `POST` | `/api/v1/evaluations` | Chronological holdout evaluation benchmarking vs. Naïve Baseline |
| `GET` | `/api/v1/news` | Live financial news headlines and sentiment scoring (`?query=AAPL`) |
| `POST` | `/api/v1/analysis/narrative` | AI-generated executive market brief and technical commentary |

For full request/response schemas and examples, see [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## Testing & Quality Assurance

Both frontend and backend are thoroughly covered by automated test suites.

### Backend Tests (Pytest)
```bash
cd backend
.venv/bin/pytest tests -v
```
- **31 test cases** verifying health checks, safe path CSV parsing, duplicate timestamp handling, zero-lookahead feature generation, chronological splits, baseline and scikit-learn models, metric calculations, and all REST endpoints.

### Frontend Quality Checks (Vitest & TypeScript)
```bash
cd frontend/artifacts/market-trend-analysis
pnpm run typecheck    # TypeScript strict validation
pnpm run test         # Vitest unit & component tests (7 tests)
pnpm run build        # Production bundle compilation
```

---

## Modeling & Leakage Prevention Strategy

Time-series forecasting requires strict chronological hygiene to produce valid, non-overfit predictions:

1. **Chronological Splitting**: Samples are never shuffled randomly. The test holdout is strictly the latest $N\%$ of observations.
2. **Scaler Isolation**: `StandardScaler` is fitted on historical training rows only. Test and inference samples are transformed without recalculating mean or variance.
3. **Autoregressive Feature Engineering**:
   - Lag features: $y_{t-1}, y_{t-2}, \dots, y_{t-7}$.
   - Rolling features: strictly shifted by 1 (`shift(1).rolling(w)`) so observation $t$ does not include $y_t$.
4. **Benchmark Comparison**: Every evaluation reports performance gains relative to a Naïve Persistence Baseline over the exact same target and date window.

---

## Roadmap & Next Steps

- [x] Fast, production-ready FastAPI backend with clean routing and service separation.
- [x] Safe CSV dataset ingestion and live Alpha Vantage data synchronization.
- [x] Zero-leakage feature engineering, Naïve baseline, SMA, and Ridge Regression.
- [x] Chronological holdout evaluation engine with MAE, RMSE, MSE, $R^2$, MAPE, and Directional Accuracy.
- [x] Live news sentiment analysis (GNews) and AI executive narratives (Google Gemini).
- [x] Interactive React dashboard with visual Recharts forecasting and demo fallback.
- [ ] **Stage C: Deep Learning LSTM Extension**:
  - Sliding 3D window generation (`[samples, window_size, features]`).
  - PyTorch/Keras LSTM recurrent cells compared directly against the Ridge regression baseline.
- [ ] **Multi-Asset Portfolio Correlation**: Correlation matrices and cross-asset beta calculations.

---

## Documentation Links

- [Backend Documentation](backend/README.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Frontend ↔ Backend API Contract](docs/API_CONTRACT.md)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.