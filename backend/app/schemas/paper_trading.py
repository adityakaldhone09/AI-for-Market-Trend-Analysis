from typing import List, Optional
from pydantic import BaseModel, Field


class PaperPosition(BaseModel):
    symbol: str
    instrument_name: str
    shares: int
    entry_price: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    opened_at: str


class PaperOrder(BaseModel):
    order_id: str
    symbol: str
    side: str  # "BUY" | "SELL"
    order_type: str  # "MARKET" | "LIMIT"
    quantity: int
    price: float
    fill_price: float
    status: str  # "FILLED" | "PENDING" | "REJECTED" | "CANCELLED"
    transaction_cost: float
    created_at: str
    filled_at: Optional[str] = None


class PaperAccountSummary(BaseModel):
    account_id: str = "PAPER_SIM_001"
    currency: str = "INR"
    initial_capital: float = 1000000.0
    cash_balance: float
    portfolio_value: float
    total_equity: float
    total_realized_pnl: float
    total_unrealized_pnl: float
    total_return_pct: float
    positions_count: int
    simulator_status: str  # "RUNNING" | "PAUSED"
    positions: List[PaperPosition] = Field(default_factory=list)
    recent_orders: List[PaperOrder] = Field(default_factory=list)
    disclaimer: str = (
        "Simulation / Paper Trading Only. No real funds or broker connections are utilized. "
        "Strictly for quantitative strategy testing and educational purposes."
    )


class PlaceOrderRequest(BaseModel):
    symbol: Optional[str] = "NIFTY50"
    side: str = Field(..., description="'BUY' or 'SELL'")
    quantity: int = Field(..., ge=1, description="Number of units/shares")
    order_type: str = Field("MARKET", description="'MARKET' or 'LIMIT'")
    limit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class ClosePositionRequest(BaseModel):
    symbol: str = "NIFTY50"
