from datetime import datetime
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.core.config import settings
from app.core.logging import logger
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError
from app.schemas.backtest import (
    BacktestMetrics,
    BacktestRequest,
    BacktestResponse,
    EquityPoint,
    TradeRecord,
)


class BacktestService:
    """Rigorous strategy backtesting engine with next-bar execution, slippage, and performance metrics."""

    def __init__(self):
        self.loader = CSVDataLoader()

    def run_backtest(self, req: BacktestRequest) -> BacktestResponse:
        sym = req.symbol or settings.PRIMARY_MARKET_SYMBOL
        df, meta = self.loader.load_dataset(sym)

        if df.empty or len(df) < 50:
            raise DataIngestionError(f"Insufficient historical data ({len(df)} bars) to run backtest for '{sym}'.")

        # Optional date filtering
        if req.start_date:
            df = df[df["timestamp"] >= pd.to_datetime(req.start_date)]
        if req.end_date:
            df = df[df["timestamp"] <= pd.to_datetime(req.end_date)]

        df = df.sort_values(by="timestamp").reset_index(drop=True)
        n = len(df)
        if n < 30:
            raise DataIngestionError("Filtered backtest period has fewer than 30 trading sessions.")

        close = df["close"].values
        high = df["high"].values if "high" in df.columns else close
        low = df["low"].values if "low" in df.columns else close
        open_ = df["open"].values if "open" in df.columns else close

        # Precompute indicators
        close_s = pd.Series(close)
        fast_ma = close_s.rolling(req.fast_ma_period, min_periods=req.fast_ma_period).mean().values
        slow_ma = close_s.rolling(req.slow_ma_period, min_periods=req.slow_ma_period).mean().values

        # RSI
        delta = close_s.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(com=13, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(com=13, min_periods=14, adjust=False).mean()
        rsi = (100 - (100 / (1 + (avg_gain / avg_loss.replace(0, np.nan))))).values

        # ATR
        tr = np.maximum(
            high - low,
            np.maximum(
                np.abs(high - np.roll(close, 1)),
                np.abs(low - np.roll(close, 1)),
            ),
        )
        atr = pd.Series(tr).rolling(14, min_periods=14).mean().values

        # 200 SMA for trend filter
        sma_200 = close_s.rolling(200, min_periods=50).mean().values

        # Simulation variables
        capital = float(req.initial_capital)
        fee_rate = req.transaction_cost_pct / 100.0

        position = 0  # 0 = FLAT, 1 = LONG
        entry_price = 0.0
        entry_idx = 0
        shares = 0
        total_fees = 0.0

        trades: List[TradeRecord] = []
        equity_curve: List[EquityPoint] = []
        trade_id_counter = 1

        benchmark_initial_shares = capital / close[0]
        peak_equity = capital

        # Start simulation after warmup period
        warmup = max(req.fast_ma_period, req.slow_ma_period, 20)

        for i in range(warmup, n):
            ts = df["timestamp"].iloc[i]
            ts_str = ts.strftime("%Y-%m-%d") if isinstance(ts, pd.Timestamp) else str(ts)[:10]

            curr_close = close[i]
            curr_open = open_[i]

            # Signal determined at close of previous session (i-1)
            # Executed at current bar (i) open or close -> Next Bar Execution
            prev_fast = fast_ma[i - 1]
            prev_slow = slow_ma[i - 1]
            prev_prev_fast = fast_ma[i - 2] if i >= 2 else prev_fast
            prev_prev_slow = slow_ma[i - 2] if i >= 2 else prev_slow
            prev_rsi = rsi[i - 1]
            prev_close = close[i - 1]
            prev_sma200 = sma_200[i - 1]
            prev_atr = atr[i - 1]

            signal_enter = False
            signal_exit = False
            exit_reason = "signal_exit"

            if req.strategy_type == "trend_following":
                # Moving Average Crossover (Fast MA crosses above Slow MA)
                if prev_prev_fast <= prev_prev_slow and prev_fast > prev_slow:
                    signal_enter = True
                elif prev_prev_fast >= prev_prev_slow and prev_fast < prev_slow:
                    signal_exit = True

            elif req.strategy_type == "rsi_momentum":
                # Buy when RSI crosses above oversold, exit when RSI crosses above overbought
                if rsi[i - 2] <= req.rsi_oversold and prev_rsi > req.rsi_oversold:
                    signal_enter = True
                elif prev_rsi >= req.rsi_overbought:
                    signal_exit = True

            elif req.strategy_type == "trend_volatility_filtered":
                # Trend filtered: Price > 200 SMA AND Fast MA > Slow MA
                is_bull_regime = (pd.notna(prev_sma200) and prev_close > prev_sma200)
                if is_bull_regime and prev_fast > prev_slow and prev_rsi > 45:
                    signal_enter = True
                elif prev_fast < prev_slow or prev_close < prev_sma200:
                    signal_exit = True

                # Check trailing stop-loss based on ATR
                if position == 1 and pd.notna(prev_atr):
                    stop_level = entry_price - (req.atr_stop_multiplier * prev_atr)
                    if curr_close < stop_level:
                        signal_exit = True
                        exit_reason = "stop_loss"

            else:  # ml_signal_strategy or default
                # Momentum & Trend combined
                if prev_fast > prev_slow and prev_rsi > 50:
                    signal_enter = True
                elif prev_fast < prev_slow or prev_rsi < 45:
                    signal_exit = True

            # Execute Signals (Long / Flat)
            if position == 0 and signal_enter:
                # Buy on next bar
                buy_price = curr_open if pd.notna(curr_open) else curr_close
                cost = capital * fee_rate
                total_fees += cost
                investable = capital - cost
                shares = int(investable / buy_price)
                if shares > 0:
                    entry_price = buy_price
                    entry_idx = i
                    position = 1
                    capital -= (shares * buy_price) + cost

            elif position == 1 and signal_exit:
                # Sell on next bar
                sell_price = curr_open if pd.notna(curr_open) else curr_close
                gross_proceeds = shares * sell_price
                cost = gross_proceeds * fee_rate
                total_fees += cost
                net_proceeds = gross_proceeds - cost
                trade_pnl = net_proceeds - (shares * entry_price)
                ret_pct = round((trade_pnl / (shares * entry_price)) * 100, 2)

                entry_ts = df["timestamp"].iloc[entry_idx]
                entry_ts_str = entry_ts.strftime("%Y-%m-%d") if isinstance(entry_ts, pd.Timestamp) else str(entry_ts)[:10]

                trades.append(
                    TradeRecord(
                        trade_id=trade_id_counter,
                        entry_date=entry_ts_str,
                        entry_price=round(entry_price, 2),
                        exit_date=ts_str,
                        exit_price=round(sell_price, 2),
                        shares=shares,
                        position="LONG",
                        pnl=round(trade_pnl, 2),
                        return_pct=ret_pct,
                        exit_reason=exit_reason,
                    )
                )
                trade_id_counter += 1
                capital += net_proceeds
                position = 0
                shares = 0

            # Mark to market equity for current session
            current_equity = capital + (shares * curr_close if position == 1 else 0.0)
            peak_equity = max(peak_equity, current_equity)
            drawdown_pct = round(((peak_equity - current_equity) / peak_equity) * 100, 2)

            benchmark_equity = round(benchmark_initial_shares * curr_close, 2)

            equity_curve.append(
                EquityPoint(
                    date=ts_str,
                    strategy_equity=round(current_equity, 2),
                    benchmark_equity=benchmark_equity,
                    drawdown_pct=drawdown_pct,
                    position=position,
                )
            )

        # Close any open trade at final session
        if position == 1:
            final_price = close[-1]
            gross = shares * final_price
            cost = gross * fee_rate
            total_fees += cost
            net = gross - cost
            pnl = net - (shares * entry_price)
            ret_pct = round((pnl / (shares * entry_price)) * 100, 2)

            entry_ts = df["timestamp"].iloc[entry_idx]
            entry_ts_str = entry_ts.strftime("%Y-%m-%d") if isinstance(entry_ts, pd.Timestamp) else str(entry_ts)[:10]

            trades.append(
                TradeRecord(
                    trade_id=trade_id_counter,
                    entry_date=entry_ts_str,
                    entry_price=round(entry_price, 2),
                    exit_date=equity_curve[-1].date if equity_curve else "end",
                    exit_price=round(final_price, 2),
                    shares=shares,
                    position="LONG",
                    pnl=round(pnl, 2),
                    return_pct=ret_pct,
                    exit_reason="session_close",
                )
            )
            capital += net

        ending_equity = capital
        total_ret = round(((ending_equity - req.initial_capital) / req.initial_capital) * 100, 2)
        bench_ret = round(((close[-1] - close[0]) / close[0]) * 100, 2)
        alpha = round(total_ret - bench_ret, 2)

        # CAGR
        days = max((df["timestamp"].iloc[-1] - df["timestamp"].iloc[0]).days, 1) if isinstance(df["timestamp"].iloc[0], pd.Timestamp) else max(n, 1)
        years = max(days / 365.25, 0.1)
        cagr = round(((ending_equity / req.initial_capital) ** (1.0 / years) - 1.0) * 100, 2)

        # Max Drawdown
        max_dd = max([pt.drawdown_pct for pt in equity_curve], default=0.0)

        # Trade metrics
        tot_trades = len(trades)
        wins = [t for t in trades if t.pnl > 0]
        losses = [t for t in trades if t.pnl <= 0]
        win_rate = round((len(wins) / max(tot_trades, 1)) * 100, 2)

        gross_profit = sum(t.pnl for t in wins)
        gross_loss = abs(sum(t.pnl for t in losses))
        profit_factor = round(gross_profit / max(gross_loss, 1.0), 2) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)

        avg_ret = round(float(np.mean([t.return_pct for t in trades])), 2) if trades else 0.0

        # Sharpe & Sortino
        if len(equity_curve) > 2:
            eq_series = pd.Series([pt.strategy_equity for pt in equity_curve])
            daily_returns = eq_series.pct_change().dropna()
            mean_dr = daily_returns.mean()
            std_dr = daily_returns.std()
            sharpe = round(float((mean_dr / max(std_dr, 1e-6)) * np.sqrt(252)), 2)

            downside = daily_returns[daily_returns < 0]
            down_std = downside.std() if len(downside) > 1 else std_dr
            sortino = round(float((mean_dr / max(down_std, 1e-6)) * np.sqrt(252)), 2)
        else:
            sharpe = 0.0
            sortino = 0.0

        metrics = BacktestMetrics(
            initial_capital=req.initial_capital,
            ending_capital=round(ending_equity, 2),
            total_return_pct=total_ret,
            cagr_pct=cagr,
            benchmark_return_pct=bench_ret,
            alpha_pct=alpha,
            max_drawdown_pct=max_dd,
            sharpe_ratio=sharpe,
            sortino_ratio=sortino,
            total_trades=tot_trades,
            winning_trades=len(wins),
            losing_trades=len(losses),
            win_rate_pct=win_rate,
            profit_factor=profit_factor,
            average_trade_return_pct=avg_ret,
            total_fees_paid=round(total_fees, 2),
        )

        p_start = df["timestamp"].iloc[0].strftime("%Y-%m-%d") if isinstance(df["timestamp"].iloc[0], pd.Timestamp) else str(df["timestamp"].iloc[0])[:10]
        p_end = df["timestamp"].iloc[-1].strftime("%Y-%m-%d") if isinstance(df["timestamp"].iloc[-1], pd.Timestamp) else str(df["timestamp"].iloc[-1])[:10]

        return BacktestResponse(
            symbol=meta.get("symbol", sym.upper()),
            strategy_name=req.strategy_type.replace("_", " ").title(),
            strategy_type=req.strategy_type,
            period_start=p_start,
            period_end=p_end,
            total_bars=n,
            metrics=metrics,
            equity_curve=equity_curve,
            trades=trades,
            parameters=req.model_dump(),
        )


backtest_service = BacktestService()
