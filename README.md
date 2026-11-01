# NIFTY 50 Market Intelligence

A market research dashboard for exploring NIFTY 50 data, technical indicators, forecasts, explainable signals, historical strategy performance, and simulated trades. The project pairs a **React + TypeScript** frontend with a **FastAPI + Python** backend.

> **Research use only.** Forecasts and signals are informational, not investment advice or guarantees of future performance. Paper trading is simulated; the app does not send orders to brokers or exchanges.

## Features

- **Market overview** — inspect NIFTY 50 prices and market summaries in an interactive dashboard.
- **Technical analysis** — review moving averages, technical indicators, and market-regime context.
- **Market breadth and sectors** — explore constituent advances and declines, India VIX, and official sector performance.
- **Forecasts and evaluation** — request model forecasts and review historical evaluation metrics.
- **Explainable research signals** — examine the factors behind directional bias, including target and invalidation levels.
- **Strategy backtesting** — compare rule-based strategies with the NIFTY 50 benchmark using next-session execution and modeled trading costs.
- **Paper trading** — explore a simulated portfolio, orders, and positions without live broker execution.
- **Demo and API modes** — use the bundled demo experience or connect the dashboard to the FastAPI service.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI, Pydantic |
| Analytics | pandas, NumPy, scikit-learn |
| Frontend tests | Vitest |
| Backend tests | pytest |

## Quick start

### Backend

Requires Python 3.11 or newer.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`. Provider API keys are optional for features that use external data services; configure them in `backend/.env` and do not commit that file.

### Frontend

Requires Node.js and pnpm.

```bash
cd frontend
pnpm install
cd artifacts/market-trend-analysis
cp .env.example .env
pnpm run dev
```

Open `http://localhost:5173`. The example frontend configuration uses demo mode by default. To connect to the backend, set `VITE_DATA_MODE=api` and `VITE_API_BASE_URL=http://localhost:8000/api/v1` in the frontend `.env` file.

## Validation

```bash
# Backend tests
cd backend
PYTHONPATH=. pytest tests

# Frontend checks
cd ../frontend/artifacts/market-trend-analysis
pnpm run typecheck
pnpm run test
pnpm run build
```

## Modeling and simulation notes

- Forecasting uses time-ordered splits and lagged features to reduce look-ahead leakage.
- Historical strategy simulations execute after a signal is generated and model transaction costs and slippage.
- Market data and forecasts are not guarantees; verify data provenance and assumptions before drawing conclusions.

## Project documentation

- [Backend setup and API details](backend/README.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Frontend and backend API contract](docs/API_CONTRACT.md)
