import { z } from 'zod';
import { demoAdapter } from './demo-adapter';
import {
  DatasetSummarySchema,
  EvaluationSchema,
  ForecastSchema,
  MarketSchema,
  ModelSchema,
  ObservationSchema,
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

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  if (!baseUrl)
    throw new Error(
      'VITE_API_BASE_URL is not configured. Add the FastAPI base URL before using API mode.',
    );
  const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${path}.`);
  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    throw new Error(
      `Response validation failed for ${path}: ${parsed.error.issues[0]?.message ?? 'invalid payload'}`,
    );
  return parsed.data;
}
async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  if (!baseUrl)
    throw new Error(
      'VITE_API_BASE_URL is not configured. Add the FastAPI base URL before using API mode.',
    );
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${path}.`);
  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    throw new Error(
      `Response validation failed for ${path}: ${parsed.error.issues[0]?.message ?? 'invalid payload'}`,
    );
  return parsed.data;
}
const marketArray = z.array(MarketSchema);
const observationArray = z.array(ObservationSchema);
const modelArray = z.array(ModelSchema);
export const marketService = {
  health: () => getJson('/health', z.object({ status: z.string() })),
  markets: () => (mode === 'demo' ? demoAdapter.markets() : getJson('/markets', marketArray)),
  observations: async (
    marketId: string | number,
    range: { startDate?: string; endDate?: string },
  ) => {
    const id = marketIdInput.parse(marketId);
    const parsedRange = rangeInput.parse(range);
    if (mode === 'demo') return demoAdapter.observations(id, parsedRange);
    const query = new URLSearchParams({ market_id: String(id) });
    if (parsedRange.startDate) query.set('start_date', parsedRange.startDate);
    if (parsedRange.endDate) query.set('end_date', parsedRange.endDate);
    return getJson(`/market-data?${query.toString()}`, observationArray);
  },
  summary: async (marketId: string | number) => {
    const id = marketIdInput.parse(marketId);
    return mode === 'demo'
      ? demoAdapter.summary()
      : getJson(
          `/data/summary?${new URLSearchParams({ market_id: String(id) })}`,
          DatasetSummarySchema,
        );
  },
  models: () => (mode === 'demo' ? demoAdapter.models() : getJson('/models', modelArray)),
  forecast: (input: {
    market_id: string | number;
    horizon: number;
    model_id?: string | number;
  }) => {
    const parsed = forecastInput.parse(input);
    return mode === 'demo'
      ? demoAdapter.forecast()
      : postJson('/forecasts', parsed, ForecastSchema);
  },
  evaluation: (input: {
    market_id: string | number;
    model_id: string | number;
    start_date?: string;
    end_date?: string;
  }) => {
    const parsed = evaluationInput.parse(input);
    return mode === 'demo'
      ? demoAdapter.evaluation()
      : postJson('/evaluations', parsed, EvaluationSchema);
  },
};
