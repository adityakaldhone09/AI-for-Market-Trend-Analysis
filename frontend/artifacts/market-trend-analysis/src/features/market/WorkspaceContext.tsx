import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { marketService, dataMode, apiBaseUrlConfigured } from './service';
import type {
  DateRange,
  DatasetSummary,
  Evaluation,
  Forecast,
  Market,
  MarketObservation,
  Model,
} from './types';

type Resource<T> = { value: T | null; loading: boolean; error: string | null };
type WorkspaceValue = {
  markets: Resource<Market[]>;
  market: Market | null;
  setMarketId: (id: string) => void;
  observations: Resource<MarketObservation[]>;
  summary: Resource<DatasetSummary>;
  models: Resource<Model[]>;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  forecast: Resource<Forecast>;
  requestForecast: (horizon: number, modelId?: string) => Promise<void>;
  evaluation: Resource<Evaluation>;
  runEvaluation: (modelId: string) => Promise<void>;
  health: Resource<string>;
  mode: 'demo' | 'api';
  apiBaseUrlConfigured: boolean;
  refresh: () => void;
};
const empty = <T,>(): Resource<T> => ({ value: null, loading: false, error: null });
const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<Resource<Market[]>>({
    value: null,
    loading: true,
    error: null,
  });
  const [marketId, setMarketId] = useState('');
  const [observations, setObservations] = useState<Resource<MarketObservation[]>>(empty());
  const [summary, setSummary] = useState<Resource<DatasetSummary>>(empty());
  const [models, setModels] = useState<Resource<Model[]>>(empty());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [forecast, setForecast] = useState<Resource<Forecast>>(empty());
  const [evaluation, setEvaluation] = useState<Resource<Evaluation>>(empty());
  const [health, setHealth] = useState<Resource<string>>(empty());
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setMarkets((old) => ({ ...old, loading: true, error: null }));
    marketService
      .markets()
      .then((value) => {
        if (!active) return;
        setMarkets({ value, loading: false, error: null });
        setMarketId((selected) =>
          selected && value.some((item) => String(item.id) === selected)
            ? selected
            : String(value[0]?.id ?? ''),
        );
      })
      .catch((error: unknown) => {
        if (active)
          setMarkets({
            value: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Markets request failed.',
          });
      });
    if (dataMode === 'api') {
      marketService
        .health()
        .then(
          (result) => active && setHealth({ value: result.status, loading: false, error: null }),
        )
        .catch(
          (error: unknown) =>
            active &&
            setHealth({
              value: null,
              loading: false,
              error: error instanceof Error ? error.message : 'Health request failed.',
            }),
        );
    } else setHealth({ value: 'demo', loading: false, error: null });
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!marketId) return;
    let active = true;
    setObservations((old) => ({ ...old, loading: true, error: null }));
    setSummary((old) => ({ ...old, loading: true, error: null }));
    setModels((old) => ({ ...old, loading: true, error: null }));
    marketService
      .observations(marketId, dateRange)
      .then((value) => active && setObservations({ value, loading: false, error: null }))
      .catch(
        (error: unknown) =>
          active &&
          setObservations({
            value: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Market data request failed.',
          }),
      );
    marketService
      .summary(marketId)
      .then((value) => active && setSummary({ value, loading: false, error: null }))
      .catch(
        (error: unknown) =>
          active &&
          setSummary({
            value: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Dataset summary request failed.',
          }),
      );
    marketService
      .models()
      .then((value) => active && setModels({ value, loading: false, error: null }))
      .catch(
        (error: unknown) =>
          active &&
          setModels({
            value: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Models request failed.',
          }),
      );
    setForecast(empty());
    setEvaluation(empty());
    return () => {
      active = false;
    };
  }, [marketId, dateRange, reload]);

  const requestForecast = useCallback(
    async (horizon: number, modelId?: string) => {
      if (dataMode === 'demo') {
        setForecast({
          value: null,
          loading: false,
          error:
            'Backend mode is required to request a forecast. Demo mode does not run a model or create estimates.',
        });
        return;
      }
      if (!marketId) return;
      setForecast({ value: null, loading: true, error: null });
      try {
        const value = await marketService.forecast({
          market_id: marketId,
          horizon,
          ...(modelId ? { model_id: modelId } : {}),
        });
        setForecast({ value, loading: false, error: null });
      } catch (error) {
        setForecast({
          value: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Forecast request failed.',
        });
      }
    },
    [marketId],
  );
  const runEvaluation = useCallback(
    async (modelId: string) => {
      if (!marketId) return;
      setEvaluation({ value: null, loading: true, error: null });
      try {
        const value = await marketService.evaluation({
          market_id: marketId,
          model_id: modelId,
          ...(dateRange.startDate ? { start_date: dateRange.startDate } : {}),
          ...(dateRange.endDate ? { end_date: dateRange.endDate } : {}),
        });
        setEvaluation({ value, loading: false, error: null });
      } catch (error) {
        setEvaluation({
          value: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Evaluation request failed.',
        });
      }
    },
    [marketId, dateRange],
  );
  const market = markets.value?.find((item) => String(item.id) === marketId) ?? null;
  const contextValue = useMemo(
    () => ({
      markets,
      market,
      setMarketId: (id: string) => setMarketId(id),
      observations,
      summary,
      models,
      dateRange,
      setDateRange,
      forecast,
      requestForecast,
      evaluation,
      runEvaluation,
      health,
      mode: dataMode,
      apiBaseUrlConfigured,
      refresh,
    }),
    [
      markets,
      market,
      observations,
      summary,
      models,
      dateRange,
      forecast,
      requestForecast,
      evaluation,
      runEvaluation,
      health,
      refresh,
    ],
  );
  return <WorkspaceContext.Provider value={contextValue}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  return context;
}
