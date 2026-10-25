# Architecture Overview

The project is organized into a frontend workspace and a backend service that communicate over a versioned FastAPI API.

## System design

```text
Browser / UI
   |
   v
frontend/ (Vite + React + TypeScript)
   - dashboard and analysis screens
   - API service layer
   - demo fallback flow for offline or incomplete backend responses
   |
   +--> http://localhost:8000/api/v1

backend/ (FastAPI)
   - routing and HTTP contracts
   - schema validation and typed responses
   - dataset ingestion and time-series cleaning
   - feature engineering and model training
   - forecasting and evaluation services
   |
   +--> datasets/
   +--> artifacts/
   +--> ML models and metadata
```

## Frontend responsibilities

- Render overview, market-analysis, forecasting, data-explorer, and evaluation views
- Manage UI state and user input for dataset selection, model choice, and date windows
- Call the backend API via typed service functions
- Display loading, error, and demo-data notices clearly

## Backend responsibilities

- Serve the application health endpoint and versioned API
- Catalog available market datasets and dataset metadata
- Load CSV datasets and apply validation and preprocessing rules
- Generate feature sets without lookahead leakage
- Train and evaluate forecasting models
- Return predictions and metrics in JSON for the frontend to consume

## Data flow

1. Frontend requests markets or dataset metadata from `/api/v1/markets`.
2. User selects a symbol or dataset and requests historical observations.
3. Backend loads a dataset and returns normalized time-series rows.
4. The frontend renders charts, statistics, and forecast controls.
5. Forecast or evaluation requests are submitted to `/api/v1/forecasts` and `/api/v1/evaluations`.
6. Backend runs model logic and returns results with confidence or uncertainty bounds when available.

## Artifact policy

- Trained models and metadata under `backend/artifacts/` are considered project resources when they are required by the current workflow.
- Temporary generated files and caches must be excluded from Git and cleaned regularly.
- Local environment files remain outside version control and are never committed.

## Operational notes

- The backend should run on port 8000.
- The frontend development server uses port 5173 by default.
- All provider API keys remain server-side only; they are not exposed to browser code.
