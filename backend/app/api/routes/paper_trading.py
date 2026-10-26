from fastapi import APIRouter, HTTPException

from app.schemas.paper_trading import (
    ClosePositionRequest,
    PaperAccountSummary,
    PaperOrder,
    PlaceOrderRequest,
)
from app.services.paper_trading_service import paper_trading_service

router = APIRouter(prefix="/paper-trading", tags=["Paper Trading Simulator"])


@router.get("/account", response_model=PaperAccountSummary)
def get_paper_account():
    """Returns current simulated paper trading account balance, positions, PnL, and recent orders."""
    return paper_trading_service.get_account_summary()


@router.post("/order", response_model=PaperOrder)
def place_paper_order(request: PlaceOrderRequest):
    """Executes a simulated paper-trading BUY or SELL order with modeled slippage and transaction costs."""
    try:
        return paper_trading_service.place_order(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to place paper order: {str(e)}")


@router.post("/close-position", response_model=PaperOrder)
def close_paper_position(request: ClosePositionRequest):
    """Closes an active paper-trading position at the current simulated market price."""
    try:
        return paper_trading_service.close_position(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close position: {str(e)}")


@router.post("/reset", response_model=PaperAccountSummary)
def reset_paper_account():
    """Resets the simulated paper trading account to ₹1,000,000 INR initial capital."""
    return paper_trading_service.reset_account()


@router.post("/toggle")
def toggle_simulator_pause():
    """Pauses or resumes the paper trading simulator."""
    return paper_trading_service.toggle_simulator()
