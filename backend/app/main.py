from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    analysis,
    backtests,
    breadth,
    evaluations,
    forecasts,
    health,
    market_data,
    markets,
    models,
    news,
    paper_trading,
    signals,
)
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.data.loaders.synthetic_generator import ensure_default_datasets


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize logger, default datasets and directories."""
    setup_logging(settings.LOG_LEVEL)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    
    # Ensure dataset and artifact directories exist
    settings.datasets_path.mkdir(parents=True, exist_ok=True)
    settings.artifacts_path.mkdir(parents=True, exist_ok=True)
    
    # Generate default benchmark dataset if not present
    ensure_default_datasets()
    logger.info("Application startup initialization completed.")
    yield
    logger.info("Application shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend REST API for AI-driven Market Trend Analysis and Time-Series Forecasting.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global safe error handling
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please verify your request parameters."},
    )

# Root-level health endpoint
app.include_router(health.router)

# Versioned API routes under /api/v1
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(markets.router, prefix=settings.API_V1_PREFIX)
app.include_router(market_data.router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX)
app.include_router(forecasts.router, prefix=settings.API_V1_PREFIX)
app.include_router(models.router, prefix=settings.API_V1_PREFIX)
app.include_router(evaluations.router, prefix=settings.API_V1_PREFIX)
app.include_router(news.router, prefix=settings.API_V1_PREFIX)
app.include_router(breadth.router, prefix=settings.API_V1_PREFIX)
app.include_router(signals.router, prefix=settings.API_V1_PREFIX)
app.include_router(backtests.router, prefix=settings.API_V1_PREFIX)
app.include_router(paper_trading.router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
