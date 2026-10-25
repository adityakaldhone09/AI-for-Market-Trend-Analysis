# Market Trend Analysis

A responsive, analyst-focused workspace for examining historical market observations, dataset quality, backend-returned forecasts, and evaluation results.

## Run locally

```sh
pnpm --filter @workspace/market-trend-analysis dev
```

The app starts in **demo mode** by default. Fixtures are static and explicitly marked as illustrative. They are not current or historical market data from a live source. Demo mode does not run models and never fabricates forecast outputs.

To build and check:

```sh
pnpm --filter @workspace/market-trend-analysis typecheck
pnpm --filter @workspace/market-trend-analysis test
pnpm --filter @workspace/market-trend-analysis lint
pnpm --filter @workspace/market-trend-analysis build
```

Formatting convention: Prettier, two-space indentation, single quotes, trailing commas, 100-column print width. Use `pnpm --filter @workspace/market-trend-analysis format` to format source files.

## Data mode

Copy `.env.example` to `.env.local` and configure:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

When `VITE_DATA_MODE` is `api`, only responses from the configured service are rendered. Network failures, non-success responses, and schema validation failures appear explicitly in the interface. API mode never falls back to fixture data. If the base URL is not configured, the request fails visibly.

## Proposed backend integration contract

There is no market-analysis backend in this application yet. The following is a **proposed frontend integration contract**, not a claim that these routes are live:

| Method | Path | Request / purpose |
| --- | --- | --- |
| `GET` | `/health` | `{ status: string }` |
| `GET` | `/markets` | `Market[]` |
| `GET` | `/market-data?market_id=&start_date=&end_date=` | `MarketObservation[]` |
| `GET` | `/data/summary?market_id=` | `DatasetSummary` |
| `GET` | `/models` | `Model[]` |
| `POST` | `/forecasts` | `{ market_id, horizon, model_id? }` → `Forecast` |
| `POST` | `/evaluations` | `{ market_id, model_id, start_date?, end_date? }` → `Evaluation` |

Contracts are parsed with Zod before domain data reaches the views. Dates and optional market fields are handled as optional; standard market columns are never assumed. Preview pagination is client-side over the service-returned observations because the proposed data endpoint does not specify pagination parameters.

### Domain shapes

- `Market`: `id`, `name`, `symbol`, optional `currency`
- `MarketObservation`: `date`, optional OHLCV/value fields, optional `features`
- `DatasetSummary`: dataset identity, row count, date coverage, declared features, missing counts and optional statistics
- `Forecast`: market/model identity, created time, horizon, returned actual/predicted values and optional bounds
- `Model`: id, name, version and status
- `Evaluation`: model/version, period, returned metrics and optional aligned values

## Routes

- `/dashboard` — overview and observation history
- `/market-analysis` — historical series and source-reported statistics
- `/forecast` — backend forecast results and estimate disclaimer
- `/data-explorer` — metadata, missingness and bounded row preview
- `/model-evaluation` — returned model metrics and actual-vs-predicted comparison

## Limitations

- No auth, market backend, database, model execution, or server-side pagination is included.
- Demo observations, summaries, models, and evaluation points are static illustrative fixtures.
- Forecast requests are intentionally unavailable in demo mode.
- Metric interpretation, time alignment, and investment decisions remain the analyst's responsibility.
