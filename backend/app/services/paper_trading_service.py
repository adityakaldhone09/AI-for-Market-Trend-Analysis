from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader
from app.schemas.paper_trading import (
    ClosePositionRequest,
    PaperAccountSummary,
    PaperOrder,
    PaperPosition,
    PlaceOrderRequest,
)


class PaperTradingService:
    """Manages virtual paper-trading account state, order fills, position accounting, and risk checks."""

    INITIAL_CAPITAL = 1000000.0  # ₹10,00,000 INR

    def __init__(self):
        self.loader = CSVDataLoader()
        self.reset_account()

    def reset_account(self) -> PaperAccountSummary:
        self.cash = self.INITIAL_CAPITAL
        self.realized_pnl = 0.0
        self.positions: Dict[str, PaperPosition] = {}
        self.orders: List[PaperOrder] = []
        self.status = "RUNNING"
        logger.info("Paper trading account reset to initial capital.")
        return self.get_account_summary()

    def toggle_simulator(self) -> Dict[str, str]:
        self.status = "PAUSED" if self.status == "RUNNING" else "RUNNING"
        return {"simulator_status": self.status}

    def _get_current_price(self, symbol: str) -> float:
        try:
            df, _ = self.loader.load_dataset(symbol)
            if not df.empty and "close" in df.columns:
                return float(df["close"].iloc[-1])
        except Exception:
            pass
        return 22750.0  # Safe fallback if market data query fails

    def place_order(self, req: PlaceOrderRequest) -> PaperOrder:
        if self.status == "PAUSED":
            raise ValueError("Paper trading simulator is currently paused. Resume before placing orders.")

        sym = req.symbol or settings.PRIMARY_MARKET_SYMBOL
        current_mkt_price = self._get_current_price(sym)

        side = req.side.upper()
        if side not in ["BUY", "SELL"]:
            raise ValueError(f"Invalid order side '{side}'. Must be 'BUY' or 'SELL'.")

        # Fill price calculation with 0.02% simulated slippage
        slippage_pct = 0.0002
        if side == "BUY":
            fill_price = round(current_mkt_price * (1.0 + slippage_pct), 2)
        else:
            fill_price = round(current_mkt_price * (1.0 - slippage_pct), 2)

        order_val = fill_price * req.quantity
        fee = round(order_val * 0.0005, 2)  # 0.05% brokerage/taxes

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        order_id = f"ORD_{uuid.uuid4().hex[:8].upper()}"

        if side == "BUY":
            total_required = order_val + fee
            if self.cash < total_required:
                raise ValueError(
                    f"Insufficient virtual cash balance. Required: ₹{total_required:,.2f}, Available: ₹{self.cash:,.2f}"
                )

            self.cash -= total_required
            existing = self.positions.get(sym)
            if existing:
                total_shares = existing.shares + req.quantity
                avg_cost = round(((existing.shares * existing.entry_price) + (req.quantity * fill_price)) / total_shares, 2)
                self.positions[sym] = PaperPosition(
                    symbol=sym,
                    instrument_name=existing.instrument_name,
                    shares=total_shares,
                    entry_price=avg_cost,
                    current_price=fill_price,
                    market_value=round(total_shares * fill_price, 2),
                    unrealized_pnl=round((fill_price - avg_cost) * total_shares, 2),
                    unrealized_pnl_pct=round(((fill_price - avg_cost) / avg_cost) * 100, 2),
                    stop_loss=req.stop_loss or existing.stop_loss,
                    take_profit=req.take_profit or existing.take_profit,
                    opened_at=existing.opened_at,
                )
            else:
                self.positions[sym] = PaperPosition(
                    symbol=sym,
                    instrument_name="NIFTY 50 Index" if "nifty" in sym.lower() else sym.upper(),
                    shares=req.quantity,
                    entry_price=fill_price,
                    current_price=fill_price,
                    market_value=round(req.quantity * fill_price, 2),
                    unrealized_pnl=0.0,
                    unrealized_pnl_pct=0.0,
                    stop_loss=req.stop_loss,
                    take_profit=req.take_profit,
                    opened_at=now_str,
                )

        else:  # SELL
            existing = self.positions.get(sym)
            if not existing or existing.shares < req.quantity:
                avail = existing.shares if existing else 0
                raise ValueError(f"Insufficient shares to sell. Available: {avail}, Requested: {req.quantity}")

            net_proceeds = order_val - fee
            self.cash += net_proceeds
            pnl = (fill_price - existing.entry_price) * req.quantity - fee
            self.realized_pnl += pnl

            remaining_shares = existing.shares - req.quantity
            if remaining_shares == 0:
                del self.positions[sym]
            else:
                self.positions[sym] = PaperPosition(
                    symbol=sym,
                    instrument_name=existing.instrument_name,
                    shares=remaining_shares,
                    entry_price=existing.entry_price,
                    current_price=fill_price,
                    market_value=round(remaining_shares * fill_price, 2),
                    unrealized_pnl=round((fill_price - existing.entry_price) * remaining_shares, 2),
                    unrealized_pnl_pct=round(((fill_price - existing.entry_price) / existing.entry_price) * 100, 2),
                    stop_loss=existing.stop_loss,
                    take_profit=existing.take_profit,
                    opened_at=existing.opened_at,
                )

        order = PaperOrder(
            order_id=order_id,
            symbol=sym,
            side=side,
            order_type=req.order_type.upper(),
            quantity=req.quantity,
            price=current_mkt_price,
            fill_price=fill_price,
            status="FILLED",
            transaction_cost=fee,
            created_at=now_str,
            filled_at=now_str,
        )
        self.orders.insert(0, order)
        return order

    def close_position(self, req: ClosePositionRequest) -> PaperOrder:
        existing = self.positions.get(req.symbol)
        if not existing:
            raise ValueError(f"No open position found for symbol '{req.symbol}'.")
        return self.place_order(
            PlaceOrderRequest(symbol=req.symbol, side="SELL", quantity=existing.shares, order_type="MARKET")
        )

    def get_account_summary(self) -> PaperAccountSummary:
        portfolio_val = 0.0
        total_unrealized = 0.0
        updated_positions: List[PaperPosition] = []

        for sym, pos in self.positions.items():
            current_p = self._get_current_price(sym)
            mkt_val = round(pos.shares * current_p, 2)
            u_pnl = round((current_p - pos.entry_price) * pos.shares, 2)
            u_pct = round(((current_p - pos.entry_price) / pos.entry_price) * 100, 2)

            portfolio_val += mkt_val
            total_unrealized += u_pnl

            updated_positions.append(
                PaperPosition(
                    symbol=pos.symbol,
                    instrument_name=pos.instrument_name,
                    shares=pos.shares,
                    entry_price=pos.entry_price,
                    current_price=current_p,
                    market_value=mkt_val,
                    unrealized_pnl=u_pnl,
                    unrealized_pnl_pct=u_pct,
                    stop_loss=pos.stop_loss,
                    take_profit=pos.take_profit,
                    opened_at=pos.opened_at,
                )
            )

        total_eq = round(self.cash + portfolio_val, 2)
        total_ret = round(((total_eq - self.INITIAL_CAPITAL) / self.INITIAL_CAPITAL) * 100, 2)

        return PaperAccountSummary(
            account_id="PAPER_SIM_001",
            currency="INR",
            initial_capital=self.INITIAL_CAPITAL,
            cash_balance=round(self.cash, 2),
            portfolio_value=round(portfolio_val, 2),
            total_equity=total_eq,
            total_realized_pnl=round(self.realized_pnl, 2),
            total_unrealized_pnl=round(total_unrealized, 2),
            total_return_pct=total_ret,
            positions_count=len(updated_positions),
            simulator_status=self.status,
            positions=updated_positions,
            recent_orders=self.orders[:15],
        )


paper_trading_service = PaperTradingService()
