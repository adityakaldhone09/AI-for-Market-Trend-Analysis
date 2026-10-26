import type {
  Backtest,
  DatasetSummary,
  Evaluation,
  Forecast,
  Market,
  MarketBreadth,
  MarketObservation,
  Model,
  PaperAccount,
  PaperOrder,
  ResearchSignal,
  SectorsPerformance,
  TechnicalAnalysis,
} from './types';

const marketList: Market[] = [
  { id: 'nifty50_daily.csv', name: 'NIFTY 50 Benchmark Index', symbol: 'NIFTY50', currency: 'INR', exchange: 'NSE' },
  { id: 'nordic-40', name: 'Nordic 40 Index', symbol: 'N40', currency: 'SEK' },
  { id: 'harbor-energy', name: 'Harbor Energy Group', symbol: 'HEG', currency: 'USD' },
  { id: 'meridian-tech', name: 'Meridian Technology', symbol: 'MDT', currency: 'USD' },
  { id: 'india_vix_daily.csv', name: 'India VIX Volatility Index', symbol: 'INDIAVIX', currency: 'INR', exchange: 'NSE' },
  { id: 'nifty_bank_daily.csv', name: 'NIFTY Bank Index', symbol: 'NIFTYBANK', currency: 'INR', exchange: 'NSE' },
  { id: 'nifty_it_daily.csv', name: 'NIFTY IT Index', symbol: 'NIFTYIT', currency: 'INR', exchange: 'NSE' },
];

const closing = [
  1842.6, 1857.4, 1849.2, 1874.8, 1881.3, 1869.7, 1896.1, 1902.8, 1888.4, 1911.5, 1926.7, 1918.2,
  1937.9, 1929.4, 1954.6, 1962.1, 1948.7, 1973.3, 1980.6, 1967.4, 1992.8, 2003.1, 1989.5, 2014.6,
  2022.9, 2011.3, 2038.4, 2046.7, 2030.2, 2057.8, 2064.9, 2051.4, 2078.6, 2089.1, 2074.5, 2096.3,
  2107.8, 2091.6, 2120.2, 2128.4, 2112.9, 2143.7, 2151.2, 2136.8, 2162.5, 2174.1, 2159.3, 2187.6,
  2194.2, 2182.8, 2208.7, 2217.4,
];

const start = new Date('2025-01-06T12:00:00Z');
const observationRows: MarketObservation[] = closing.map((close, index) => {
  const day = new Date(start);
  day.setUTCDate(day.getUTCDate() + index * 2);
  const open = Number((close - (index % 2 ? 5.8 : -4.3)).toFixed(1));
  return {
    date: day.toISOString().slice(0, 10),
    open,
    high: Number((Math.max(open, close) + 11.4).toFixed(1)),
    low: Number((Math.min(open, close) - 9.2).toFixed(1)),
    close,
    value: close,
    volume: 1240000 + ((index * 23719) % 780000),
    features: { daily_return: Number((((close - open) / open) * 100).toFixed(2)), observed: 'yes' },
  };
});

const summary: DatasetSummary = {
  datasetName: 'Nordic daily market sample',
  rowCount: 52,
  startDate: observationRows[0].date,
  endDate: observationRows[observationRows.length - 1].date,
  features: ['open', 'high', 'low', 'close', 'volume', 'daily_return'],
  missingValues: { open: 0, high: 0, low: 0, close: 0, volume: 2, daily_return: 0 },
  statistics: {
    close: { mean: 2011.7, median: 2017.1, min: 1842.6, max: 2217.4, stdDev: 111.8 },
    volume: { mean: 1629000, median: 1591000, min: 1240000, max: 2017000, stdDev: 229000 },
    daily_return: { mean: 0.31, median: 0.28, min: -0.62, max: 1.12, stdDev: 0.38 },
  },
};

const models: Model[] = [
  { id: 'ridge-v2', name: 'Ridge baseline', version: '2.4.1', status: 'available' },
  { id: 'seasonal-naive', name: 'Seasonal naïve', version: '1.2.0', status: 'available' },
  { id: 'ets-quarterly', name: 'ETS quarterly', version: '0.9.3', status: 'experimental' },
];

const evaluation: Evaluation = {
  modelName: 'Ridge baseline',
  version: '2.4.1',
  period: '2025-01-06 — 2025-04-18',
  metrics: { MAE: 18.42, RMSE: 24.87, MAPE: 1.06, 'R²': 0.914 },
  values: observationRows.slice(-18).map((row, index) => ({
    date: row.date,
    actual: row.close ?? 0,
    predicted: Number(((row.close ?? 0) + Math.sin(index * 1.4) * 19 - 3).toFixed(1)),
  })),
};

export const demoAdapter = {
  markets: async () => marketList,
  observations: async (
    marketId: string | number,
    range?: { startDate?: string; endDate?: string },
  ) => {
    const scale = marketId === 'harbor-energy' ? 0.73 : marketId === 'meridian-tech' ? 1.21 : 1;
    return observationRows
      .filter(
        (row) =>
          (!range?.startDate || row.date >= range.startDate) &&
          (!range?.endDate || row.date <= range.endDate),
      )
      .map((row) => ({
        ...row,
        open: row.open ? Number((row.open * scale).toFixed(1)) : undefined,
        high: row.high ? Number((row.high * scale).toFixed(1)) : undefined,
        low: row.low ? Number((row.low * scale).toFixed(1)) : undefined,
        close: row.close ? Number((row.close * scale).toFixed(1)) : undefined,
      }));
  },
  summary: async () => summary,
  models: async () => models,
  evaluation: async () => evaluation,
  forecast: async (): Promise<Forecast> => {
    throw new Error('Backend mode is required. No model is run in demo mode.');
  },
  technicalAnalysis: async (): Promise<TechnicalAnalysis> => ({
    symbol: 'NIFTY50',
    name: 'NIFTY 50 Benchmark Index',
    instrument_type: 'index',
    exchange: 'NSE',
    currency: 'INR',
    frequency: '1d',
    time_zone: 'Asia/Kolkata',
    latest_timestamp: '2026-10-26',
    latest_close: 22753.2,
    latest_open: 22680.0,
    latest_high: 22820.5,
    latest_low: 22650.1,
    volume_note: 'Traded share volume is not applicable for calculated benchmark indices.',
    data_source: 'NSE / Nifty Indices Historical Records',
    dataset_provenance: { source: 'NSE', is_synthetic: false },
    staleness_state: 'fresh',
    returns: {
      daily_return_pct: 0.35,
      weekly_return_pct: 1.12,
      monthly_return_pct: -1.45,
      ytd_return_pct: 8.65,
    },
    indicators: {
      sma_20: 22620.4,
      sma_50: 23370.1,
      sma_200: 24108.5,
      ema_12: 22710.2,
      ema_26: 22890.5,
      rsi_14: 46.1,
      macd_line: -180.3,
      macd_signal: -210.1,
      macd_histogram: 29.8,
      bollinger_upper: 23150.0,
      bollinger_middle: 22620.4,
      bollinger_lower: 22090.8,
      bollinger_bandwidth: 4.68,
      atr_14: 195.4,
      rolling_volatility_annualized: 14.2,
    },
    support_resistance: {
      pivot_point: 22741.3,
      r1: 22832.5,
      r2: 22911.7,
      r3: 23002.9,
      s1: 22662.1,
      s2: 22570.9,
      s3: 22491.7,
      recent_swing_high: 23800.0,
      recent_swing_low: 22150.0,
    },
    regime: {
      regime: 'sideways',
      label: 'Consolidation / Testing Support',
      confidence: 0.72,
      rationale: [
        'Price is oscillating within intermediate range above 20-day SMA.',
        'RSI indicates neutral equilibrium at 46.1.',
        'MACD histogram shows developing positive divergence.',
      ],
      is_golden_cross: false,
      is_death_cross: true,
      price_vs_sma200: 'below',
      volatility_state: 'moderate',
    },
    observations: observationRows.map((r) => ({
      timestamp: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close ?? 22700,
      volume: r.volume,
      sma_20: r.close,
      sma_50: r.close ? r.close * 1.01 : undefined,
      sma_200: r.close ? r.close * 1.03 : undefined,
      rsi_14: 48,
    })),
  }),
  marketBreadth: async (): Promise<MarketBreadth> => ({
    timestamp: '2026-10-26',
    total_constituents: 20,
    advances: 13,
    declines: 6,
    unchanged: 1,
    advance_decline_ratio: 2.17,
    pct_above_sma20: 65.0,
    pct_above_sma50: 45.0,
    pct_above_sma200: 40.0,
    top_gainers: [
      { symbol: 'RELIANCE', name: 'Reliance Industries', weight: 9.8, close: 2980.5, change_pct: 1.85, above_sma_20: true, above_sma_50: true, above_sma_200: true, contribution: 0.1813 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', weight: 11.2, close: 1680.0, change_pct: 1.42, above_sma_20: true, above_sma_50: false, above_sma_200: false, contribution: 0.159 },
    ],
    top_losers: [
      { symbol: 'INFY', name: 'Infosys', weight: 5.6, close: 1720.0, change_pct: -1.25, above_sma_20: false, above_sma_50: false, above_sma_200: false, contribution: -0.07 },
    ],
    top_contributors: [
      { symbol: 'RELIANCE', name: 'Reliance Industries', weight: 9.8, close: 2980.5, change_pct: 1.85, above_sma_20: true, above_sma_50: true, above_sma_200: true, contribution: 0.1813 },
    ],
    breadth_signal: 'positive_divergence',
    data_source: 'NSE Top Constituents',
    staleness_state: 'fresh',
  }),
  sectorsPerformance: async (): Promise<SectorsPerformance> => ({
    timestamp: '2026-10-26',
    benchmark_symbol: 'NIFTY50',
    benchmark_close: 22753.2,
    benchmark_return_1d: 0.35,
    vix_context: {
      symbol: 'INDIAVIX',
      name: 'India VIX',
      current_value: 14.2,
      previous_value: 14.65,
      change_points: -0.45,
      change_pct: -3.07,
      regime: 'normal',
      description: 'Normal historical volatility range for Indian equities.',
    },
    sectors: [
      { symbol: 'NIFTYBANK', name: 'NIFTY Bank', close: 51240.0, change_1d_pct: 0.85, change_1w_pct: 1.4, change_1m_pct: -0.5, relative_strength_vs_nifty_1d: 0.5, relative_strength_vs_nifty_1m: 0.95, outperforming: true },
      { symbol: 'NIFTYAUTO', name: 'NIFTY Auto', close: 24500.0, change_1d_pct: 0.62, change_1w_pct: 2.1, change_1m_pct: 1.2, relative_strength_vs_nifty_1d: 0.27, relative_strength_vs_nifty_1m: 2.65, outperforming: true },
      { symbol: 'NIFTYIT', name: 'NIFTY IT', close: 38900.0, change_1d_pct: -0.45, change_1w_pct: -1.1, change_1m_pct: -3.2, relative_strength_vs_nifty_1d: -0.8, relative_strength_vs_nifty_1m: -1.75, outperforming: false },
    ],
    leading_sector: 'NIFTY Bank',
    lagging_sector: 'NIFTY IT',
    data_source: 'NSE Sector Indices',
  }),
  researchSignal: async (): Promise<ResearchSignal> => ({
    symbol: 'NIFTY50',
    instrument_name: 'NIFTY 50 Index',
    timestamp: '2026-10-26',
    latest_close: 22753.2,
    signal: 'NEUTRAL_RANGE',
    stance: 'FLAT_WAIT',
    confidence_pct: 64.0,
    horizon: 'Next 5 Trading Sessions',
    target_price_estimate: 22753.2,
    expected_return_pct: 0.0,
    invalidation_level: 22570.9,
    risk_reward_ratio: 1.0,
    regime: 'Range-Bound / Consolidation',
    primary_factors: [
      { category: 'trend', indicator: 'Intermediate Trend', reading: 'Testing 20-day SMA', weight: 30, contribution: 'neutral', detail: 'Holding near 22,600 support.' },
      { category: 'momentum', indicator: 'RSI (14)', reading: '46.1', weight: 25, contribution: 'neutral', detail: 'Balanced momentum.' },
      { category: 'volatility', indicator: 'India VIX', reading: '14.2 (Normal)', weight: 20, contribution: 'bullish', detail: 'Subdued implied volatility.' },
      { category: 'market_breadth', indicator: 'Advances vs Declines', reading: '13 Adv / 6 Dec', weight: 25, contribution: 'bullish', detail: 'Positive breadth divergence.' },
    ],
    ml_model_consensus: 'Neutral consolidation range between 22,500 and 23,000.',
    staleness_state: 'fresh',
    disclaimer: 'Research signal for educational decision support. Not personalized financial advice.',
  }),
  backtest: async (): Promise<Backtest> => ({
    symbol: 'NIFTY50',
    strategy_name: 'Trend Following',
    strategy_type: 'trend_following',
    period_start: '2022-01-01',
    period_end: '2026-10-26',
    total_bars: 1200,
    metrics: {
      initial_capital: 1000000,
      ending_capital: 1485200,
      total_return_pct: 48.52,
      cagr_pct: 10.42,
      benchmark_return_pct: 35.18,
      alpha_pct: 13.34,
      max_drawdown_pct: 11.2,
      sharpe_ratio: 1.15,
      sortino_ratio: 1.62,
      total_trades: 18,
      winning_trades: 11,
      losing_trades: 7,
      win_rate_pct: 61.1,
      profit_factor: 2.15,
      average_trade_return_pct: 2.68,
      total_fees_paid: 4820.0,
    },
    equity_curve: [
      { date: '2025-01-01', strategy_equity: 1000000, benchmark_equity: 1000000, drawdown_pct: 0, position: 0 },
      { date: '2026-10-26', strategy_equity: 1485200, benchmark_equity: 1351800, drawdown_pct: 3.2, position: 1 },
    ],
    trades: [
      { trade_id: 1, entry_date: '2025-02-10', entry_price: 22100, exit_date: '2025-04-15', exit_price: 23200, shares: 45, position: 'LONG', pnl: 49500, return_pct: 4.97, exit_reason: 'signal_exit' },
    ],
    parameters: { fast_ma_period: 20, slow_ma_period: 50 },
    disclaimer: 'Modeled next-bar execution simulation.',
  }),
  paperAccount: async (): Promise<PaperAccount> => ({
    account_id: 'PAPER_SIM_001',
    currency: 'INR',
    initial_capital: 1000000,
    cash_balance: 772468,
    portfolio_value: 227532,
    total_equity: 1000000,
    total_realized_pnl: 0,
    total_unrealized_pnl: 0,
    total_return_pct: 0,
    positions_count: 1,
    simulator_status: 'RUNNING',
    positions: [
      { symbol: 'NIFTY50', instrument_name: 'NIFTY 50 Benchmark Index', shares: 10, entry_price: 22753.2, current_price: 22753.2, market_value: 227532, unrealized_pnl: 0, unrealized_pnl_pct: 0, opened_at: '2026-10-26T12:00:00Z' },
    ],
    recent_orders: [
      { order_id: 'ORD_001', symbol: 'NIFTY50', side: 'BUY', order_type: 'MARKET', quantity: 10, price: 22753.2, fill_price: 22753.2, status: 'FILLED', transaction_cost: 113.7, created_at: '2026-10-26T12:00:00Z' },
    ],
    disclaimer: 'Simulated Paper Trading.',
  }),
};
