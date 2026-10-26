import { z } from 'zod';
import { demoAdapter } from './demo-adapter';
import {
  BacktestSchema,
  DatasetSummarySchema,
  EvaluationSchema,
  ForecastSchema,
  MarketBreadthSchema,
  MarketSchema,
  ModelSchema,
  ObservationSchema,
  PaperAccountSchema,
  PaperOrderSchema,
  ResearchSignalSchema,
  SectorsPerformanceSchema,
  TechnicalAnalysisSchema,
} from './types';

const mode: 'api' | 'demo' = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'demo';
const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
export const dataMode = mode;
export const apiBaseUrlConfigured = Boolean(baseUrl);

const marketIdInput = z.union([z.string().min(1), z.number().finite()]);
const optionalDateInput = z
  .string()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Date must use YYYY-MM-DD.')
  .transform((value) => value || undefined)
  .optional();

const rangeInput = z
  .object({
    startDate: optionalDateInput,
    endDate: optionalDateInput,
  })
  .refine((range) => !range.startDate || !range.endDate || range.startDate <= range.endDate, {
    message: 'Start date must be on or before end date.',
  });

const forecastInput = z.object({
  market_id: marketIdInput,
  horizon: z.number().int().min(1).max(365),
  model_id: marketIdInput.optional(),
});

const evaluationInput = z
  .object({
    market_id: marketIdInput,
    model_id: marketIdInput,
    start_date: optionalDateInput,
    end_date: optionalDateInput,
  })
  .refine((range) => !range.start_date || !range.end_date || range.start_date <= range.end_date, {
    message: 'Start date must be on or before end date.',
  });

async function fetchJson(path: string): Promise<any> {
  if (!baseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Add the FastAPI base URL before using API mode.',
    );
  }
  const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${path}.`);
  return response.json();
}

async function sendPostJson(path: string, body: unknown): Promise<any> {
  if (!baseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Add the FastAPI base URL before using API mode.',
    );
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${path}.`);
  return response.json();
}

function validateResponse<T>(path: string, payload: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Response validation failed for ${path}: ${parsed.error.issues[0]?.message ?? 'invalid payload'}`,
    );
  }
  return parsed.data;
}

const marketArray = z.array(MarketSchema);
const observationArray = z.array(ObservationSchema);
const modelArray = z.array(ModelSchema);

export const marketService = {
  health: async () => {
    const raw = await fetchJson('/health');
    return validateResponse('/health', raw, z.object({ status: z.string() }));
  },

  markets: async () => {
    if (mode === 'demo') return demoAdapter.markets();
    const raw = await fetchJson('/markets');
    let items: any;
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && Array.isArray(raw.markets)) {
      items = raw.markets.map((m: any) => ({
        id: m.id ?? m.dataset_name ?? m.symbol,
        name: m.name ?? m.symbol ?? m.dataset_name,
        symbol: m.symbol ?? m.dataset_name,
        currency: m.currency ?? 'USD',
      }));
    } else if (raw && Array.isArray(raw.datasets)) {
      items = raw.datasets.map((d: any) => ({
        id: d.dataset_name,
        name: d.name ?? d.symbol ?? d.dataset_name,
        symbol: d.symbol ?? (d.dataset_name ? d.dataset_name.replace('.csv', '') : 'MARKET'),
        currency: d.currency ?? 'USD',
      }));
    } else {
      items = raw;
    }
    return validateResponse('/markets', items, marketArray);
  },

  observations: async (
    marketId: string | number,
    range: { startDate?: string; endDate?: string },
  ) => {
    const id = marketIdInput.parse(marketId);
    const parsedRange = rangeInput.parse(range);
    if (mode === 'demo') return demoAdapter.observations(id, parsedRange);

    const query = new URLSearchParams({ market_id: String(id), limit: '500' });
    if (parsedRange.startDate) query.set('start_date', parsedRange.startDate);
    if (parsedRange.endDate) query.set('end_date', parsedRange.endDate);

    const raw = await fetchJson(`/market-data?${query.toString()}`);
    let items: any;
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && Array.isArray(raw.data)) {
      items = raw.data.map((row: any) => ({
        date:
          row.date ??
          (typeof row.timestamp === 'string' ? row.timestamp.slice(0, 10) : String(row.timestamp ?? '')),
        open: row.open != null ? Number(row.open) : undefined,
        high: row.high != null ? Number(row.high) : undefined,
        low: row.low != null ? Number(row.low) : undefined,
        close:
          row.close != null
            ? Number(row.close)
            : row.target_value != null
              ? Number(row.target_value)
              : undefined,
        volume: row.volume != null ? Number(row.volume) : undefined,
        value:
          row.value != null
            ? Number(row.value)
            : row.close != null
              ? Number(row.close)
              : Number(row.target_value ?? 0),
        features: row.features ?? undefined,
      }));
    } else {
      items = raw;
    }
    return validateResponse(`/market-data?${query.toString()}`, items, observationArray);
  },

  summary: async (marketId: string | number) => {
    const id = marketIdInput.parse(marketId);
    if (mode === 'demo') return demoAdapter.summary();

    const path = `/data/summary?${new URLSearchParams({ market_id: String(id) })}`;
    const raw = await fetchJson(path);

    let normalized: any;
    if (raw && typeof raw === 'object') {
      const statsObj: Record<string, any> = {};
      const rawStats = raw.statistics ?? raw.descriptive_statistics ?? {};
      for (const [col, s] of Object.entries(rawStats)) {
        if (s && typeof s === 'object') {
          const item = s as any;
          statsObj[col] = {
            mean: item.mean != null ? Number(item.mean) : undefined,
            median: item.median != null ? Number(item.median) : undefined,
            min: item.min != null ? Number(item.min) : undefined,
            max: item.max != null ? Number(item.max) : undefined,
            stdDev: (item.stdDev ?? item.std) != null ? Number(item.stdDev ?? item.std) : undefined,
          };
        }
      }

      const mvMap: Record<string, number> = {};
      if (raw.missingValues && typeof raw.missingValues === 'object') {
        Object.assign(mvMap, raw.missingValues);
      } else if (Array.isArray(raw.missing_values)) {
        for (const item of raw.missing_values) {
          if (item && item.column) mvMap[item.column] = Number(item.missing_count ?? 0);
        }
      }

      normalized = {
        datasetName: raw.datasetName ?? raw.dataset_name ?? raw.dataset ?? String(id),
        rowCount: Number(raw.rowCount ?? raw.row_count ?? 0),
        startDate: String(raw.startDate ?? raw.start_date ?? raw.date_range?.start_date ?? ''),
        endDate: String(raw.endDate ?? raw.end_date ?? raw.date_range?.end_date ?? ''),
        features: Array.isArray(raw.features) ? raw.features : (raw.columns ?? []),
        missingValues: mvMap,
        statistics: statsObj,
      };
    } else {
      normalized = raw;
    }
    return validateResponse(path, normalized, DatasetSummarySchema);
  },

  models: async () => {
    if (mode === 'demo') return demoAdapter.models();
    const raw = await fetchJson('/models');
    let items: any;
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && Array.isArray(raw.models)) {
      items = raw.models.map((m: any) => ({
        id: m.id ?? m.model_id ?? m.key ?? 'model',
        name: m.name ?? 'Model',
        version: m.version ?? '1.0.0',
        status: m.status ?? m.readiness_status ?? 'ready',
      }));
    } else {
      items = raw;
    }
    return validateResponse('/models', items, modelArray);
  },

  forecast: async (input: {
    market_id: string | number;
    horizon: number;
    model_id?: string | number;
  }) => {
    const parsed = forecastInput.parse(input);
    if (mode === 'demo') return demoAdapter.forecast();

    const body = {
      market_id: String(parsed.market_id),
      dataset_name: String(parsed.market_id),
      horizon: parsed.horizon,
      model_type: parsed.model_id ? String(parsed.model_id) : 'baseline_naive',
      model_id: parsed.model_id ? String(parsed.model_id) : 'baseline_naive',
    };

    const raw = await sendPostJson('/forecasts', body);
    let normalized: any;
    if (raw && typeof raw === 'object') {
      const rawValues = Array.isArray(raw.values) ? raw.values : (raw.predictions ?? raw.forecasts ?? []);
      const normalizedValues = rawValues.map((pt: any) => ({
        date: String(pt.date ?? pt.timestamp ?? ''),
        actual: pt.actual != null ? Number(pt.actual) : undefined,
        predicted: Number(pt.predicted ?? pt.predicted_value ?? pt.value ?? 0),
        lowerBound:
          (pt.lowerBound ?? pt.lower ?? pt.lower_bound) != null
            ? Number(pt.lowerBound ?? pt.lower ?? pt.lower_bound)
            : undefined,
        upperBound:
          (pt.upperBound ?? pt.upper ?? pt.upper_bound) != null
            ? Number(pt.upperBound ?? pt.upper ?? pt.upper_bound)
            : undefined,
      }));

      normalized = {
        marketId: raw.marketId ?? raw.symbol ?? raw.dataset_name ?? parsed.market_id,
        modelName: raw.modelName ?? raw.model_name ?? 'Forecasting Model',
        modelVersion: raw.modelVersion ?? raw.model_version ?? '1.0.0',
        createdAt: raw.createdAt ?? raw.generated_at ?? new Date().toISOString(),
        horizon: Number(raw.horizon ?? parsed.horizon),
        values: normalizedValues,
      };
    } else {
      normalized = raw;
    }
    return validateResponse('/forecasts', normalized, ForecastSchema);
  },

  evaluation: async (input: {
    market_id: string | number;
    model_id: string | number;
    start_date?: string;
    end_date?: string;
  }) => {
    const parsed = evaluationInput.parse(input);
    if (mode === 'demo') return demoAdapter.evaluation();

    const body = {
      market_id: String(parsed.market_id),
      dataset_name: String(parsed.market_id),
      model_id: String(parsed.model_id),
      model_type: String(parsed.model_id),
      start_date: parsed.start_date,
      end_date: parsed.end_date,
    };

    const raw = await sendPostJson('/evaluations', body);
    let normalized: any;
    if (raw && typeof raw === 'object') {
      const metricsObj: Record<string, number> = {};
      const rawMetrics = raw.metrics ?? {};
      if (typeof rawMetrics === 'object') {
        for (const [k, v] of Object.entries(rawMetrics)) {
          if (typeof v === 'number') metricsObj[k] = v;
        }
      }
      if (raw.mae != null) metricsObj.mae = Number(raw.mae);
      if (raw.rmse != null) metricsObj.rmse = Number(raw.rmse);
      if (raw.mse != null) metricsObj.mse = Number(raw.mse);
      if (raw.r2 != null) metricsObj.r2 = Number(raw.r2);

      const rawValues = Array.isArray(raw.values) ? raw.values : [];
      const normalizedValues = rawValues.map((v: any) => ({
        date: String(v.date ?? v.timestamp ?? ''),
        actual: Number(v.actual ?? 0),
        predicted: Number(v.predicted ?? 0),
      }));

      normalized = {
        modelName: raw.modelName ?? raw.model_name ?? String(parsed.model_id),
        version: raw.version ?? '1.0.0',
        period: raw.period ?? `${raw.test_period?.start ?? ''} to ${raw.test_period?.end ?? ''}`,
        metrics: metricsObj,
        values: normalizedValues.length > 0 ? normalizedValues : undefined,
      };
    } else {
      normalized = raw;
    }
    return validateResponse('/evaluations', normalized, EvaluationSchema);
  },

  technicalAnalysis: async (symbol: string = 'NIFTY50') => {
    if (mode === 'demo') return demoAdapter.technicalAnalysis();
    const raw = await fetchJson(`/analysis/technical?symbol=${encodeURIComponent(symbol)}`);
    return validateResponse('/analysis/technical', raw, TechnicalAnalysisSchema);
  },

  marketBreadth: async () => {
    if (mode === 'demo') return demoAdapter.marketBreadth();
    const raw = await fetchJson('/market-breadth');
    return validateResponse('/market-breadth', raw, MarketBreadthSchema);
  },

  sectorsPerformance: async () => {
    if (mode === 'demo') return demoAdapter.sectorsPerformance();
    const raw = await fetchJson('/sectors/performance');
    return validateResponse('/sectors/performance', raw, SectorsPerformanceSchema);
  },

  researchSignal: async (symbol: string = 'NIFTY50', horizon: number = 5) => {
    if (mode === 'demo') return demoAdapter.researchSignal();
    const raw = await sendPostJson('/signals', { symbol, horizon_days: horizon });
    return validateResponse('/signals', raw, ResearchSignalSchema);
  },

  backtest: async (params: {
    symbol?: string;
    strategy_type?: string;
    initial_capital?: number;
    transaction_cost_pct?: number;
    fast_ma_period?: number;
    slow_ma_period?: number;
    rsi_oversold?: number;
    rsi_overbought?: number;
  }) => {
    if (mode === 'demo') return demoAdapter.backtest();
    const raw = await sendPostJson('/backtests', params);
    return validateResponse('/backtests', raw, BacktestSchema);
  },

  paperAccount: async () => {
    if (mode === 'demo') return demoAdapter.paperAccount();
    const raw = await fetchJson('/paper-trading/account');
    return validateResponse('/paper-trading/account', raw, PaperAccountSchema);
  },

  placePaperOrder: async (order: {
    symbol?: string;
    side: string;
    quantity: number;
    order_type?: string;
    limit_price?: number;
    stop_loss?: number;
    take_profit?: number;
  }) => {
    if (mode === 'demo') {
      const acc = await demoAdapter.paperAccount();
      return acc.recent_orders[0];
    }
    const raw = await sendPostJson('/paper-trading/order', order);
    return validateResponse('/paper-trading/order', raw, PaperOrderSchema);
  },

  closePaperPosition: async (symbol: string = 'NIFTY50') => {
    if (mode === 'demo') {
      const acc = await demoAdapter.paperAccount();
      return acc.recent_orders[0];
    }
    const raw = await sendPostJson('/paper-trading/close-position', { symbol });
    return validateResponse('/paper-trading/close-position', raw, PaperOrderSchema);
  },

  resetPaperAccount: async () => {
    if (mode === 'demo') return demoAdapter.paperAccount();
    const raw = await sendPostJson('/paper-trading/reset', {});
    return validateResponse('/paper-trading/reset', raw, PaperAccountSchema);
  },

  toggleSimulator: async () => {
    if (mode === 'demo') return { simulator_status: 'RUNNING' };
    return sendPostJson('/paper-trading/toggle', {});
  },
};
