import { useMemo, useState } from 'react';
import { AlertTriangle, CircleHelp, CircleStop, TrendingUp } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkspace } from '@/features/market/WorkspaceContext';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  Panel,
  RangeControls,
} from '@/components/MarketUI';
import type { Forecast } from '@/features/market/types';

const noForecastRows: Forecast['values'] = [];
export function ForecastPage() {
  const { mode, market, models, forecast, requestForecast } = useWorkspace();
  const [horizon, setHorizon] = useState(10);
  const [modelId, setModelId] = useState('');
  const selectedModel =
    models.value?.find((model) => String(model.id) === modelId) ?? models.value?.[0];
  const rows = forecast.value?.values ?? noForecastRows;
  const chartRows = useMemo(
    () =>
      rows.map((item) => ({
        ...item,
        interval:
          item.lowerBound !== undefined && item.upperBound !== undefined
            ? [item.lowerBound, item.upperBound]
            : undefined,
      })),
    [rows],
  );
  const submit = () => {
    void requestForecast(horizon, selectedModel ? String(selectedModel.id) : undefined);
  };
  return (
    <>
      <PageHeading
        overline="Model output / review before use"
        title="Forecast review"
        description="Inspect forecast values returned by the configured service. Forecasts are estimates, not observations or a guarantee of future performance."
      />
      <div className="mb-5">
        <RangeControls />
      </div>
      <div
        className="mb-5 flex items-start gap-3 rounded-xl border border-[#d9c6a7] bg-[#f6eddf] px-4 py-3.5"
        role="note"
        data-testid="forecast-disclaimer"
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#a36c3b]" />
        <div>
          <div className="text-[11px] font-bold text-[#6f4e32]">
            Estimate, not observed market data
          </div>
          <p className="mb-0 mt-1 text-[11px] leading-relaxed text-[#7c634c]">
            Forecast outputs are backend-returned model estimates. Review the model, horizon,
            training context, and uncertainty bounds before using an output. This workspace does not
            provide investment advice.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title="Forecast output"
          eyebrow="Returned estimates"
          aside={
            forecast.value && (
              <span className="rounded-full bg-[#f3e6d7] px-2.5 py-1 font-mono text-[9px] tracking-wide text-[#845630]">
                MODEL ESTIMATE
              </span>
            )
          }
        >
          {forecast.loading ? (
            <div className="p-5">
              <LoadingState label="Requesting forecast from backend" />
            </div>
          ) : forecast.error ? (
            <div className="p-5">
              <ErrorState message={forecast.error} onRetry={submit} />
            </div>
          ) : forecast.value && rows.length ? (
            <>
              <div className="grid grid-cols-1 gap-3 border-b border-[#eee9df] p-5 md:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Model', forecast.value.modelName],
                  ['Version', forecast.value.modelVersion ?? 'Not supplied'],
                  ['Horizon', `${forecast.value.horizon} steps`],
                  ['Created', new Date(forecast.value.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="eyebrow">{label}</div>
                    <div className="mt-1.5 truncate text-[11px] font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-4 pt-5">
                <div
                  className="data-grid h-[330px] rounded-lg p-2"
                  role="img"
                  aria-label="Backend forecast estimates and optional uncertainty bounds"
                  data-testid="chart-forecast"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartRows}
                      margin={{ top: 10, right: 16, bottom: 3, left: 0 }}
                    >
                      <CartesianGrid stroke="#d9ddd6" strokeDasharray="2 5" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#87908d', fontSize: 9, fontFamily: 'DM Mono' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={35}
                      />
                      <YAxis
                        tick={{ fill: '#87908d', fontSize: 9, fontFamily: 'DM Mono' }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#253543',
                          border: 0,
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: 11,
                        }}
                        labelStyle={{ color: '#d7c39e', fontFamily: 'DM Mono' }}
                      />
                      <Area
                        dataKey="interval"
                        name="Returned interval"
                        type="monotone"
                        stroke="none"
                        fill="#d49a67"
                        fillOpacity={0.18}
                        connectNulls
                      />
                      <Line
                        dataKey="actual"
                        name="Actual (if supplied)"
                        type="monotone"
                        stroke="#93a4a0"
                        strokeWidth={1.6}
                        strokeDasharray="4 4"
                        dot={false}
                        connectNulls
                      />
                      <Line
                        dataKey="predicted"
                        name="Predicted"
                        type="monotone"
                        stroke="#b26939"
                        strokeWidth={2.3}
                        dot={{ r: 2, fill: '#b26939' }}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-3 font-mono text-[9px] text-[#7c8887]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-[2px] w-4 border-t border-dashed border-[#93a4a0]" />
                    ACTUAL, IF PROVIDED
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-[2px] w-4 bg-[#b26939]" />
                    PREDICTED ESTIMATE
                  </span>
                  <span className="ml-auto">{rows.length} returned steps</span>
                </div>
              </div>
              <div className="overflow-x-auto border-t border-[#eee9df] scrollbar-thin">
                <table className="w-full min-w-[500px] text-left text-[11px]">
                  <thead className="bg-[#f6f3ed] font-mono text-[9px] text-[#7d8989]">
                    <tr>
                      <th className="px-5 py-3 font-medium">DATE</th>
                      <th className="px-4 py-3 text-right font-medium">ACTUAL</th>
                      <th className="px-4 py-3 text-right font-medium">PREDICTED</th>
                      <th className="px-4 py-3 text-right font-medium">LOWER BOUND</th>
                      <th className="px-5 py-3 text-right font-medium">UPPER BOUND</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece4]">
                    {rows.map((row) => (
                      <tr key={row.date}>
                        <td className="mono px-5 py-3 text-[#59696e]">{row.date}</td>
                        <td className="mono px-4 py-3 text-right text-[#7c8988]">
                          {row.actual?.toLocaleString() ?? '—'}
                        </td>
                        <td className="mono px-4 py-3 text-right font-semibold text-[#995a33]">
                          {row.predicted.toLocaleString()}
                        </td>
                        <td className="mono px-4 py-3 text-right text-[#7c8988]">
                          {row.lowerBound?.toLocaleString() ?? '—'}
                        </td>
                        <td className="mono px-5 py-3 text-right text-[#7c8988]">
                          {row.upperBound?.toLocaleString() ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState
              title="No forecast requested"
              detail={
                mode === 'demo'
                  ? 'Demo mode never runs a model or invents future estimates. Switch to API mode with a configured backend to request and review a forecast.'
                  : 'Choose a horizon and model, then request a forecast from the configured API.'
              }
            />
          )}
        </Panel>
        <div className="space-y-5">
          <Panel title="Request parameters" eyebrow="Backend request">
            <div className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="forecast-horizon"
                  className="mb-1.5 block text-[10px] font-semibold text-[#627176]"
                >
                  Forecast horizon
                </label>
                <select
                  id="forecast-horizon"
                  data-testid="select-horizon"
                  value={horizon}
                  onChange={(event) => setHorizon(Number(event.target.value))}
                  className="focus-ring w-full rounded-lg border border-[#ded9cf] bg-white px-3 py-2.5 text-[12px] font-semibold"
                >
                  <option value={5}>5 periods</option>
                  <option value={10}>10 periods</option>
                  <option value={20}>20 periods</option>
                  <option value={30}>30 periods</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="forecast-model"
                  className="mb-1.5 block text-[10px] font-semibold text-[#627176]"
                >
                  Model
                </label>
                {models.error ? (
                  <div className="text-[11px] text-[#984d42]">{models.error}</div>
                ) : (
                  <select
                    id="forecast-model"
                    data-testid="select-model"
                    value={selectedModel ? String(selectedModel.id) : ''}
                    onChange={(event) => setModelId(event.target.value)}
                    disabled={models.loading || !models.value?.length}
                    className="focus-ring w-full rounded-lg border border-[#ded9cf] bg-white px-3 py-2.5 text-[12px] font-semibold disabled:opacity-60"
                  >
                    {models.value?.map((model) => (
                      <option key={model.id} value={String(model.id)}>
                        {model.name} · {model.version}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                data-testid="button-request-forecast"
                onClick={submit}
                disabled={
                  forecast.loading || models.loading || (!models.value?.length && mode === 'api')
                }
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6963] px-4 py-3 text-[11px] font-bold text-white transition hover:bg-[#255a55] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <TrendingUp size={15} />
                {mode === 'demo' ? 'Explain backend requirement' : 'Request forecast'}
              </button>
              {mode === 'demo' && (
                <div className="flex items-start gap-2 rounded-lg bg-[#f6f1e8] p-3 text-[10px] leading-relaxed text-[#826747]">
                  <CircleStop size={13} className="mt-0.5 shrink-0" />
                  This control will not call a model in demonstration mode.
                </div>
              )}
              {mode === 'api' && !selectedModel && (
                <div className="text-[10px] text-[#9d5549]">
                  A model response is not available; check the models request.
                </div>
              )}
            </div>
          </Panel>
          <Panel title="Output provenance" eyebrow="Read before interpreting">
            <div className="space-y-3 p-5 text-[11px] leading-relaxed text-[#68777b]">
              <p className="m-0 flex gap-2">
                <CircleHelp size={14} className="mt-0.5 shrink-0 text-[#bf8653]" /> Forecast values
                come only from the configured service response.
              </p>
              <p className="m-0">
                The chart does not continue or extrapolate historical observations in the browser.
              </p>
              <p className="m-0">
                Missing actuals or bounds remain blank; they are never inferred.
              </p>
              {market && (
                <div className="border-t border-[#eee9df] pt-3 font-mono text-[9px] text-[#84908c]">
                  INSTRUMENT {market.symbol} · {market.currency ?? 'CURRENCY NOT PROVIDED'}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
