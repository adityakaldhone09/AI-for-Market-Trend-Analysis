from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    symbol: Optional[str] = "NIFTY50"
    strategy_type: str = Field(
        "trend_following",
        description="'trend_following' (SMA cross), 'rsi_momentum', 'trend_volatility_filtered', 'ml_signal_strategy'",
    )
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_capital: float = Field(1000000.0, ge=10000.0, description="Initial capital in INR")
    transaction_cost_pct: float = Field(0.05, ge=0.0, le=2.0, description="Cost per transaction in % (brokerage + STT + slippage)")
    # Strategy specific parameters
    fast_ma_period: int = Field(20, ge=5, le=100)
    slow_ma_period: int = Field(50, ge=10, le=300)
    rsi_oversold: float = Field(35.0, ge=10.0, le=50.0)
    rsi_overbought: float = Field(65.0, ge=50.0, le=90.0)
    atr_stop_multiplier: float = Field(2.0, ge=0.5, le=5.0)


class TradeRecord(BaseModel):
    trade_id: int
    entry_date: str
    entry_price: float
    exit_date: str
    exit_price: float
    shares: int
    position: str = "LONG"
    pnl: float
    return_pct: float
    exit_reason: str  # "signal_exit" | "stop_loss" | "session_close"


class EquityPoint(BaseModel):
    date: str
    strategy_equity: float
    benchmark_equity: float
    drawdown_pct: float
    position: int  # 1 (long) or 0 (flat)


class BacktestMetrics(BaseModel):
    initial_capital: float
    ending_capital: float
    total_return_pct: float
    cagr_pct: float
    benchmark_return_pct: float
    alpha_pct: float
    max_drawdown_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    average_trade_return_pct: float
    total_fees_paid: float


class BacktestResponse(BaseModel):
    symbol: str
    strategy_name: str
    strategy_type: str
    period_start: str
    period_end: str
    total_bars: int
    metrics: BacktestMetrics
    equity_curve: List[EquityPoint]
    trades: List[TradeRecord]
    parameters: Dict[str, Any]
    disclaimer: str = (
        "Backtest results are historical simulations based on modeled next-bar execution and theoretical fees. "
        "Past performance is not indicative of future live market returns."
    )
