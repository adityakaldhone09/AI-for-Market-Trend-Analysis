import { z } from 'zod';

export const MarketSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  symbol: z.string(),
  currency: z.string().optional(),
  exchange: z.string().optional(),
  description: z.string().optional(),
  is_synthetic: z.boolean().optional(),
});

export const ObservationSchema = z.object({
  date: z.string(),
  open: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  close: z.number().optional(),
  volume: z.number().optional(),
  value: z.number().optional(),
  features: z.record(z.union([z.number(), z.string(), z.null()])).optional(),
});

export const DatasetSummarySchema = z.object({
  datasetName: z.string(),
  rowCount: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  features: z.array(z.string()),
  missingValues: z.record(z.number()),
  statistics: z.record(
    z.object({
      mean: z.number().optional(),
      median: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      stdDev: z.number().optional(),
    }),
  ),
});

export const ForecastSchema = z.object({
  marketId: z.union([z.string(), z.number()]),
  modelName: z.string(),
  modelVersion: z.string().optional(),
  createdAt: z.string(),
  horizon: z.number(),
  values: z.array(
    z.object({
      date: z.string(),
      actual: z.number().optional(),
      predicted: z.number(),
      lowerBound: z.number().optional(),
      upperBound: z.number().optional(),
    }),
  ),
});

export const ModelSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  version: z.string(),
  status: z.string(),
  description: z.string().optional(),
});

export const EvaluationSchema = z.object({
  modelName: z.string(),
  version: z.string(),
  period: z.string(),
  metrics: z.record(z.number()),
  values: z
    .array(z.object({ date: z.string(), actual: z.number(), predicted: z.number() }))
    .optional(),
  baselineComparison: z.record(z.union([z.string(), z.number()])).optional(),
});

// Technical Analysis Schemas
export const IndicatorValuesSchema = z.object({
  sma_20: z.number().nullable().optional(),
  sma_50: z.number().nullable().optional(),
  sma_200: z.number().nullable().optional(),
  ema_12: z.number().nullable().optional(),
  ema_26: z.number().nullable().optional(),
  rsi_14: z.number().nullable().optional(),
  macd_line: z.number().nullable().optional(),
  macd_signal: z.number().nullable().optional(),
  macd_histogram: z.number().nullable().optional(),
  bollinger_upper: z.number().nullable().optional(),
  bollinger_middle: z.number().nullable().optional(),
  bollinger_lower: z.number().nullable().optional(),
  bollinger_bandwidth: z.number().nullable().optional(),
  atr_14: z.number().nullable().optional(),
  rolling_volatility_annualized: z.number().nullable().optional(),
});

export const SupportResistanceSchema = z.object({
  pivot_point: z.number(),
  r1: z.number(),
  r2: z.number(),
  r3: z.number(),
  s1: z.number(),
  s2: z.number(),
  s3: z.number(),
  recent_swing_high: z.number().nullable().optional(),
  recent_swing_low: z.number().nullable().optional(),
});

export const RegimeSchema = z.object({
  regime: z.string(),
  label: z.string(),
  confidence: z.number(),
  rationale: z.array(z.string()),
  is_golden_cross: z.boolean(),
  is_death_cross: z.boolean(),
  price_vs_sma200: z.string().nullable().optional(),
  volatility_state: z.string(),
});

export const TechnicalObservationSchema = z.object({
  timestamp: z.string(),
  open: z.number().nullable().optional(),
  high: z.number().nullable().optional(),
  low: z.number().nullable().optional(),
  close: z.number(),
  volume: z.number().nullable().optional(),
  sma_20: z.number().nullable().optional(),
  sma_50: z.number().nullable().optional(),
  sma_200: z.number().nullable().optional(),
  rsi_14: z.number().nullable().optional(),
  macd: z.number().nullable().optional(),
  macd_signal: z.number().nullable().optional(),
  macd_hist: z.number().nullable().optional(),
  bollinger_upper: z.number().nullable().optional(),
  bollinger_lower: z.number().nullable().optional(),
});

export const TechnicalAnalysisSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  instrument_type: z.string(),
  exchange: z.string(),
  currency: z.string(),
  frequency: z.string(),
  time_zone: z.string(),
  latest_timestamp: z.string(),
  latest_close: z.number(),
  latest_open: z.number().nullable().optional(),
  latest_high: z.number().nullable().optional(),
  latest_low: z.number().nullable().optional(),
  volume_note: z.string(),
  data_source: z.string(),
  dataset_provenance: z.record(z.any()),
  staleness_state: z.string(),
  returns: z.object({
    daily_return_pct: z.number().nullable().optional(),
    weekly_return_pct: z.number().nullable().optional(),
    monthly_return_pct: z.number().nullable().optional(),
    ytd_return_pct: z.number().nullable().optional(),
  }),
  indicators: IndicatorValuesSchema,
  support_resistance: SupportResistanceSchema,
  regime: RegimeSchema,
  observations: z.array(TechnicalObservationSchema),
});

// Market Breadth Schemas
export const ConstituentBreadthItemSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  weight: z.number(),
  close: z.number(),
  change_pct: z.number(),
  above_sma_20: z.boolean(),
  above_sma_50: z.boolean(),
  above_sma_200: z.boolean(),
  contribution: z.number(),
});

export const MarketBreadthSchema = z.object({
  timestamp: z.string(),
  total_constituents: z.number(),
  advances: z.number(),
  declines: z.number(),
  unchanged: z.number(),
  advance_decline_ratio: z.number(),
  pct_above_sma20: z.number(),
  pct_above_sma50: z.number(),
  pct_above_sma200: z.number(),
  top_gainers: z.array(ConstituentBreadthItemSchema),
  top_losers: z.array(ConstituentBreadthItemSchema),
  top_contributors: z.array(ConstituentBreadthItemSchema),
  breadth_signal: z.string(),
  data_source: z.string(),
  staleness_state: z.string(),
});

// Sector Performance Schemas
export const SectorPerformanceItemSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  close: z.number(),
  change_1d_pct: z.number(),
  change_1w_pct: z.number().nullable().optional(),
  change_1m_pct: z.number().nullable().optional(),
  relative_strength_vs_nifty_1d: z.number(),
  relative_strength_vs_nifty_1m: z.number().nullable().optional(),
  outperforming: z.boolean(),
});

export const VixContextSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  current_value: z.number(),
  previous_value: z.number(),
  change_points: z.number(),
  change_pct: z.number(),
  regime: z.string(),
  description: z.string(),
});

export const SectorsPerformanceSchema = z.object({
  timestamp: z.string(),
  benchmark_symbol: z.string(),
  benchmark_close: z.number(),
  benchmark_return_1d: z.number(),
  vix_context: VixContextSchema.nullable().optional(),
  sectors: z.array(SectorPerformanceItemSchema),
  leading_sector: z.string().nullable().optional(),
  lagging_sector: z.string().nullable().optional(),
  data_source: z.string(),
});

// Research Signal Schemas
export const SignalFactorSchema = z.object({
  category: z.string(),
  indicator: z.string(),
  reading: z.string(),
  weight: z.number(),
  contribution: z.string(),
  detail: z.string(),
});

export const ResearchSignalSchema = z.object({
  symbol: z.string(),
  instrument_name: z.string(),
  timestamp: z.string(),
  latest_close: z.number(),
  signal: z.string(),
  stance: z.string(),
  confidence_pct: z.number(),
  horizon: z.string(),
  target_price_estimate: z.number().nullable().optional(),
  expected_return_pct: z.number().nullable().optional(),
  invalidation_level: z.number(),
  risk_reward_ratio: z.number().nullable().optional(),
  regime: z.string(),
  primary_factors: z.array(SignalFactorSchema),
  ml_model_consensus: z.string(),
  staleness_state: z.string(),
  disclaimer: z.string(),
});

// Backtest Schemas
export const TradeRecordSchema = z.object({
  trade_id: z.number(),
  entry_date: z.string(),
  entry_price: z.number(),
  exit_date: z.string(),
  exit_price: z.number(),
  shares: z.number(),
  position: z.string(),
  pnl: z.number(),
  return_pct: z.number(),
  exit_reason: z.string(),
});

export const EquityPointSchema = z.object({
  date: z.string(),
  strategy_equity: z.number(),
  benchmark_equity: z.number(),
  drawdown_pct: z.number(),
  position: z.number(),
});

export const BacktestMetricsSchema = z.object({
  initial_capital: z.number(),
  ending_capital: z.number(),
  total_return_pct: z.number(),
  cagr_pct: z.number(),
  benchmark_return_pct: z.number(),
  alpha_pct: z.number(),
  max_drawdown_pct: z.number(),
  sharpe_ratio: z.number(),
  sortino_ratio: z.number(),
  total_trades: z.number(),
  winning_trades: z.number(),
  losing_trades: z.number(),
  win_rate_pct: z.number(),
  profit_factor: z.number(),
  average_trade_return_pct: z.number(),
  total_fees_paid: z.number(),
});

export const BacktestSchema = z.object({
  symbol: z.string(),
  strategy_name: z.string(),
  strategy_type: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  total_bars: z.number(),
  metrics: BacktestMetricsSchema,
  equity_curve: z.array(EquityPointSchema),
  trades: z.array(TradeRecordSchema),
  parameters: z.record(z.any()),
  disclaimer: z.string(),
});

// Paper Trading Schemas
export const PaperPositionSchema = z.object({
  symbol: z.string(),
  instrument_name: z.string(),
  shares: z.number(),
  entry_price: z.number(),
  current_price: z.number(),
  market_value: z.number(),
  unrealized_pnl: z.number(),
  unrealized_pnl_pct: z.number(),
  stop_loss: z.number().nullable().optional(),
  take_profit: z.number().nullable().optional(),
  opened_at: z.string(),
});

export const PaperOrderSchema = z.object({
  order_id: z.string(),
  symbol: z.string(),
  side: z.string(),
  order_type: z.string(),
  quantity: z.number(),
  price: z.number(),
  fill_price: z.number(),
  status: z.string(),
  transaction_cost: z.number(),
  created_at: z.string(),
  filled_at: z.string().nullable().optional(),
});

export const PaperAccountSchema = z.object({
  account_id: z.string(),
  currency: z.string(),
  initial_capital: z.number(),
  cash_balance: z.number(),
  portfolio_value: z.number(),
  total_equity: z.number(),
  total_realized_pnl: z.number(),
  total_unrealized_pnl: z.number(),
  total_return_pct: z.number(),
  positions_count: z.number(),
  simulator_status: z.string(),
  positions: z.array(PaperPositionSchema),
  recent_orders: z.array(PaperOrderSchema),
  disclaimer: z.string(),
});

export type Market = z.infer<typeof MarketSchema>;
export type MarketObservation = z.infer<typeof ObservationSchema>;
export type DatasetSummary = z.infer<typeof DatasetSummarySchema>;
export type Forecast = z.infer<typeof ForecastSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type TechnicalAnalysis = z.infer<typeof TechnicalAnalysisSchema>;
export type MarketBreadth = z.infer<typeof MarketBreadthSchema>;
export type SectorsPerformance = z.infer<typeof SectorsPerformanceSchema>;
export type ResearchSignal = z.infer<typeof ResearchSignalSchema>;
export type Backtest = z.infer<typeof BacktestSchema>;
export type PaperAccount = z.infer<typeof PaperAccountSchema>;
export type PaperOrder = z.infer<typeof PaperOrderSchema>;
export type DateRange = { startDate: string; endDate: string };
