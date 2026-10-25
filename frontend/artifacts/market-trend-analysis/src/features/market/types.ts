import { z } from 'zod';

export const MarketSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  symbol: z.string(),
  currency: z.string().optional(),
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
});
export const EvaluationSchema = z.object({
  modelName: z.string(),
  version: z.string(),
  period: z.string(),
  metrics: z.record(z.number()),
  values: z
    .array(z.object({ date: z.string(), actual: z.number(), predicted: z.number() }))
    .optional(),
});
export type Market = z.infer<typeof MarketSchema>;
export type MarketObservation = z.infer<typeof ObservationSchema>;
export type DatasetSummary = z.infer<typeof DatasetSummarySchema>;
export type Forecast = z.infer<typeof ForecastSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type DateRange = { startDate: string; endDate: string };
