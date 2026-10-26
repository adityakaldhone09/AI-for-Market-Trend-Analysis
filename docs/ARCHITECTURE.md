# NIFTY 50 AI Market Intelligence, Forecasting and Strategy Research Platform
## System Architecture

The platform is designed as an institutional-grade financial-market analytics and quantitative-research system specializing in the Indian equity index market (NIFTY 50). It provides time-series forecasting, technical chart analysis, explainable signal generation, strategy backtesting, and virtual paper trading with zero live broker execution risk.

```text
React + TypeScript Dashboard (Port 5173)
  ├── 1. Overview & NIFTY 50 Interactive OHLC Chart
  ├── 2. Technical Analysis (20/50/200 SMA, Bollinger, RSI, MACD, ATR, Pivots, Regimes)
  ├── 3. Market Breadth & Sectors (Advances/Declines, % > SMAs, Top Gainers/Losers, India VIX)
  ├── 4. ML Forecasts & Chronological Holdout Evaluation
  ├── 5. Explainable Research Signals (Multi-factor bias, targets, invalidation levels)
  ├── 6. Quantitative Strategy Backtesting (Next-bar execution, fees, slippage, trade log)
  └── 7. Virtual Paper Trading Simulator (₹1,000,000 cash, positions, orders, pause/kill)
                               |
                               v REST JSON API (/api/v1)
FastAPI Backend Service (Port 8000)
  ├── /api/v1/markets & /api/v1/market-data (Canonical NIFTY 50 & sector observations)
  ├── /api/v1/analysis/technical (Moving averages, indicators, pivot points, regime engine)
  ├── /api/v1/market-breadth & /api/v1/sectors/performance (Breadth & NSE sector indices)
  ├── /api/v1/models, /api/v1/forecasts, /api/v1/evaluations (Naïve, Ridge, Random Forest)
  ├── /api/v1/signals & /api/v1/signals/latest (Transparent factor weights & invalidation)
  ├── /api/v1/backtests (Trend-following, Mean-reversion, Momentum vs NIFTY 50 benchmark)
  └── /api/v1/paper-trading/* (Simulated portfolio, orders, positions, risk controls)
                               |
                               v
Provider Adapters & Normalized Data Layer
  ├── CSV Provider (Isolated dataset loader with canonical symbol mappings)
  ├── NSE / Nifty Indices Historical Datasets (Canonical NIFTY 50 daily OHLC series)
  └── DhanHQ API Adapter Hook (Credentials server-side only in backend/.env)
                               |
                               v
Data Storage & Artifacts
  ├── datasets/raw/ (nifty50_daily.csv, india_vix_daily.csv, sector indices, constituents)
  ├── datasets/processed/ (Cleaned, time-ordered features)
  └── artifacts/ (Trained scikit-learn models & evaluation metadata JSON)
```

## Architectural Principles & Integrity Guarantees

1. **Benchmark Volume Nuance**:
   - An index benchmark (e.g. NIFTY 50) is a mathematical basket, not a traded stock with native share volume. Traded volume is kept `null` / unfabricated rather than injected with fake zeros, with an explicit transparency note displayed in UI and schemas.
2. **Zero-Lookahead Forecasting & Splits**:
   - Time-ordered chronological train/validation/test splits without random shuffling.
   - Scalers (`StandardScaler`) fit strictly on train partitions.
   - Lagged features calculated on strictly prior periods (`shift(1)`).
3. **Realistic Strategy Backtesting**:
   - Execution occurs at bar $t+1$ open or close after signal generation at bar $t$, eliminating look-ahead bias.
   - Real transaction costs (0.03% default) and slippage (0.02% default) applied to every executed trade.
4. **Isolated Virtual Paper Trading**:
   - Sandboxed portfolio with ₹1,000,000 INR starting capital.
   - Zero outbound broker calls; completely decoupled from live exchange order routing.
5. **Regulatory Separation & SEBI Compliance**:
   - Outputs are classified as *research signals* and *decision support*, not personalized investment advice or guaranteed return recommendations.
   - Designed in alignment with SEBI retail algorithmic trading guidelines (circulars dated 4 February 2025 and 30 September 2025 extension).

