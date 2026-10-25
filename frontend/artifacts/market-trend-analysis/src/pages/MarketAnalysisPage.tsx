import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
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

function numericValue(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key] ?? (row.features as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
export function MarketAnalysisPage() {
  const { market, observations, summary, refresh } = useWorkspace();
  const features = summary.value?.features ?? [];
  const [featureChoice, setFeatureChoice] = useState('');
  const selectedFeature = features.includes(featureChoice) ? featureChoice : (features[0] ?? '');
  const stats = selectedFeature ? summary.value?.statistics[selectedFeature] : undefined;
  const chartData = useMemo(
    () =>
      (observations.value ?? [])
        .map((row) => ({
          date: row.date,
          value: selectedFeature
            ? numericValue(row as unknown as Record<string, unknown>, selectedFeature)
            : undefined,
        }))
        .filter((row) => row.value !== undefined),
    [observations.value, selectedFeature],
  );
  const change =
    chartData.length > 1
      ? ((chartData.at(-1)!.value! - chartData[0].value!) / chartData[0].value!) * 100
      : undefined;
  return (
    <>
      <PageHeading
        overline="Recorded evidence / descriptive view"
        title="Historical analysis"
        description="Inspect the returned observation series and dataset-reported descriptive statistics. This view does not project future values."
      />
      <div className="mb-5">
        <RangeControls />
      </div>
      {observations.loading && !observations.value ? (
        <LoadingState />
      ) : observations.error ? (
        <ErrorState message={observations.error} onRetry={refresh} />
      ) : !observations.value?.length ? (
        <EmptyState
          title="No observations in this period"
          detail="Adjust the selected range or review the source dataset coverage."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Rows in view', observations.value.length.toLocaleString(), 'returned records'],
              [
                'First recorded',
                observations.value[0].date,
                market?.symbol ?? 'selected instrument',
              ],
              ['Last recorded', observations.value.at(-1)?.date ?? '—', 'latest point in view'],
              [
                'Period movement',
                change === undefined ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
                'first to last point',
              ],
            ].map(([label, value, note]) => (
              <div key={label} className="surface px-4 py-3.5">
                <div className="eyebrow">{label}</div>
                <div className="mono mt-2 text-[16px] font-medium">{value}</div>
                <div className="mt-1 text-[10px] text-[#818b8b]">{note}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
            <Panel
              title="Observation series"
              eyebrow="Historical values"
              aside={
                <select
                  aria-label="Chart feature"
                  data-testid="select-chart-feature"
                  value={selectedFeature}
                  onChange={(event) => setFeatureChoice(event.target.value)}
                  className="focus-ring max-w-[160px] rounded-md border border-[#e5dfd3] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#46565b]"
                >
                  {features.length ? (
                    features.map((feature) => (
                      <option key={feature} value={feature}>
                        {feature}
                      </option>
                    ))
                  ) : (
                    <option value="">No declared features</option>
                  )}
                </select>
              }
            >
              {chartData.length < 2 ? (
                <EmptyState
                  title="Series unavailable"
                  detail="The selected feature has fewer than two numeric values in the returned observations."
                />
              ) : (
                <div className="px-3 pb-4 pt-4">
                  <div className="mb-2 flex items-center justify-between px-3">
                    <div>
                      <div className="eyebrow">{selectedFeature} · recorded</div>
                      <div className="mono mt-1 text-[24px]">
                        {chartData
                          .at(-1)
                          ?.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {change !== undefined && (
                      <div
                        className={`flex items-center gap-1 font-mono text-[10px] ${change >= 0 ? 'text-[#39805c]' : 'text-[#a05247]'}`}
                      >
                        {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(change).toFixed(2)}% over shown period
                      </div>
                    )}
                  </div>
                  <div
                    className="data-grid h-[330px] rounded-lg p-2"
                    role="img"
                    aria-label={`Historical ${selectedFeature} observations`}
                    data-testid="chart-historical-observations"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 18, left: 0, bottom: 3 }}
                      >
                        <CartesianGrid stroke="#d9ddd6" strokeDasharray="2 5" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#87908d', fontSize: 9, fontFamily: 'DM Mono' }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={38}
                        />
                        <YAxis
                          domain={['dataMin', 'dataMax']}
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
                        <Line
                          dataKey="value"
                          name={selectedFeature}
                          type="monotone"
                          stroke="#2d706a"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#d89a61', stroke: '#fff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex items-center gap-2 px-3 font-mono text-[9px] tracking-[.08em] text-[#808b89]">
                    <span className="size-2 rounded-full bg-[#2d706a]" /> OBSERVATION{' '}
                    <span className="ml-auto">{chartData.length} POINTS</span>
                  </div>
                </div>
              )}
            </Panel>
            <Panel
              title="Descriptive statistics"
              eyebrow="Dataset summary response"
              aside={<Activity size={15} className="text-[#56877c]" />}
            >
              {summary.loading && !summary.value ? (
                <div className="p-4">
                  <LoadingState />
                </div>
              ) : summary.error ? (
                <div className="p-4">
                  <ErrorState message={summary.error} onRetry={refresh} />
                </div>
              ) : stats ? (
                <div className="divide-y divide-[#eee9df]">
                  {(['mean', 'median', 'min', 'max', 'stdDev'] as const).map((key) => (
                    <div key={key} className="flex items-center justify-between px-5 py-3.5">
                      <span className="text-[11px] capitalize text-[#728082]">
                        {key === 'stdDev' ? 'Standard deviation' : key}
                      </span>
                      <span className="mono text-[12px] font-medium">
                        {stats[key] === undefined
                          ? '—'
                          : stats[key]!.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </span>
                    </div>
                  ))}
                  <div className="bg-[#f8f6f0] px-5 py-3 text-[10px] leading-relaxed text-[#7a8584]">
                    Values are presented as returned; unavailable fields remain blank. No statistics
                    are calculated in the browser.
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Statistics not supplied"
                  detail={`No statistics for ${selectedFeature || 'a declared feature'} were included in the summary response.`}
                />
              )}
            </Panel>
          </div>
          <Panel title="Latest observations" eyebrow="Recorded sample" className="mt-5">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[540px] text-left text-[11px]">
                <thead className="bg-[#f6f3ed] font-mono text-[9px] tracking-[.06em] text-[#7d8989]">
                  <tr>
                    <th className="px-5 py-3 font-medium">DATE</th>
                    {features.slice(0, 5).map((feature) => (
                      <th key={feature} className="px-4 py-3 text-right font-medium">
                        {feature.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece4]">
                  {observations.value
                    .slice(-8)
                    .reverse()
                    .map((row) => (
                      <tr key={row.date} className="hover:bg-[#faf8f3]">
                        <td className="mono px-5 py-3 text-[#59696e]">{row.date}</td>
                        {features.slice(0, 5).map((feature) => {
                          const value = numericValue(
                            row as unknown as Record<string, unknown>,
                            feature,
                          );
                          return (
                            <td key={feature} className="mono px-4 py-3 text-right text-[#33444c]">
                              {value === undefined
                                ? '—'
                                : value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
