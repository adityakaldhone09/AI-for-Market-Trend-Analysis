import type {
  DatasetSummary,
  Evaluation,
  Forecast,
  Market,
  MarketObservation,
  Model,
} from './types';

// Static fixtures are illustrative only; no observations or forecasts are generated at runtime.
const marketList: Market[] = [
  { id: 'nordic-40', name: 'Nordic 40 Index', symbol: 'N40', currency: 'SEK' },
  { id: 'harbor-energy', name: 'Harbor Energy Group', symbol: 'HEG', currency: 'USD' },
  { id: 'meridian-tech', name: 'Meridian Technology', symbol: 'MDT', currency: 'USD' },
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
    throw new Error('Forecast requests require backend mode. No model is run in demo mode.');
  },
};
