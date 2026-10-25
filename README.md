# AI for Market Trend Analysis

A full-stack market intelligence platform combining a Python/FastAPI backend, forecasting engine, and a Vite/React frontend for dataset exploration, market analytics, and model evaluation.

## Project structure

The repository root now contains the canonical application folders:

```text
AI-for-Market-Trend-Analysis/
├── backend/                      # FastAPI service and ML pipeline
├── frontend/                     # Vite + React workspace
├── docs/                         # Architecture and API docs
├── README.md
├── .gitignore
└── .gitignore
```

The current frontend workspace is a pnpm monorepo, and the runnable application entry lives in:

```text
frontend/artifacts/market-trend-analysis/
```

This preserves the existing working framework and package configuration while keeping the repository root organized and consistent.

## Tech stack

- Frontend: Vite, React, TypeScript, pnpm
- Backend: FastAPI, Pydantic, Pandas, NumPy, scikit-learn
- ML workflows: chronological holdout validation, lag/rolling feature engineering, baseline and regression models
- Data: CSV datasets and generated synthetic market data

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Run tests
PYTHONPATH=. pytest tests -q

# Start the API
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API is available at:
- Health: http://localhost:8000/health
- Swagger: http://localhost:8000/docs

## Frontend setup

```bash
cd frontend
pnpm install
cd artifacts/market-trend-analysis
pnpm install
pnpm run dev -- --host 0.0.0.0 --port 5173
```

The app runs at:
- http://localhost:5173

The workspace expects the backend to be running on:
- http://localhost:8000/api/v1

## Environment variables

### Backend
Use `backend/.env.example` as the template for local secrets and settings. Keep provider credentials on the backend only.

### Frontend
Use `frontend/artifacts/market-trend-analysis/.env.example` for the browser-facing API URL and data mode.

Example:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Data and model artifacts

- Backend datasets are stored under `backend/datasets/`
- Trained model artifacts are stored under `backend/artifacts/`
- Use `backend/requirements.txt` to reinstall dependencies if the environment is recreated

## Verification

- Backend tests: `cd backend && PYTHONPATH=. pytest tests -q`
- Frontend install/build: run from the actual app directory (`frontend/artifacts/market-trend-analysis`)

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- [backend/README.md](backend/README.md)

## Notes

- The repository preserves the working code, datasets, and model artifacts already present in the workspace.
- The project was reorganized without discarding nested git history or unrelated user work.
- No secrets are committed; local environment files remain untracked and should stay in each project directory.