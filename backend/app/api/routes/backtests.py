from fastapi import APIRouter, HTTPException
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.services.backtest_service import backtest_service

router = APIRouter(tags=["Strategy Backtesting"])


@router.post("/backtests", response_model=BacktestResponse)
def run_strategy_backtest(request: BacktestRequest):
    """
    Executes a historical strategy simulation over NIFTY 50 observations with realistic
    next-bar execution, transaction costs/slippage, drawdowns, and trade log.
    """
    try:
        return backtest_service.run_backtest(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest execution failed: {str(e)}")
