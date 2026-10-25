import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Database, Layers3, ScanLine } from 'lucide-react';
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
  StatBlock,
} from '@/components/MarketUI';

function numeric(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key] ?? (row.features as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
const noObservations: import('@/features/market/types').MarketObservation[] = [];
export function DashboardPage() {
  const { market, markets, observations, summary, refresh, mode } = useWorkspace();
  const values = observations.value ?? noObservations;
  const metric = summary.value?.features.find((feature) =>
    values.some((row) => numeric(row as unknown as Record<string, unknown>, feature) !== undefined),
  );
  const chartRows = useMemo(
    () =>
      values
        .map((row) => ({
          date: row.date,
          value: metric ? numeric(row as unknown as Record<string, unknown>, metric) : undefined,
        }))
        .filter((row) => row.value !== undefined),
    [values, metric],
  );
  const latest = chartRows.at(-1)?.value;
  const previous = chartRows.at(-2)?.value;
  const delta = latest !== undefined && previous !== undefined ? latest - previous : undefined;
  const movement = delta !== undefined && previous ? (delta / previous) * 100 : undefined;
  const missing = summary.value
    ? Object.values(summary.value.missingValues).reduce((total, n) => total + n, 0)
    : undefined;

  return (
    <>
      <PageHeading
        overline="Research desk / daily brief"
        title="Market overview"
        description="A measured view of the latest recorded observations, dataset coverage, and available research instruments."
        actions={
          <span
            className={`rounded-full px-3 py-2 font-mono text-[9px] tracking-[.1em] ${mode === 'demo' ? 'bg-[#f2e5d7] text-[#865333]' : 'bg-[#dcebe4] text-[#326450]'}`}
          >
            {mode === 'demo' ? 'ILLUSTRATIVE FIXTURE' : 'VALIDATED SERVICE DATA'}
          </span>
        }
      />
      <div className="mb-5">
        <RangeControls />
      </div>
      {markets.loading && !markets.value ? (
        <LoadingState label="Loading markets" />
      ) : markets.error ? (
        <ErrorState message={markets.error} onRetry={refresh} />
      ) : !markets.value?.length ? (
        <EmptyState
          title="No markets returned"
          detail="The configured data service did not return any markets."
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatBlock
              label="Market"
              value={market?.symbol ?? '—'}
              note={market?.name ?? 'Select a market'}
            />
            <StatBlock
              label="Latest observation"
              value={
                latest === undefined
                  ? '—'
                  : `${market?.currency ? `${market.currency} ` : ''}${latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              }
              note={chartRows.at(-1)?.date ?? 'No observations returned'}
            />
            <StatBlock
              label="Coverage rows"
              value={summary.value ? summary.value.rowCount.toLocaleString() : '—'}
              note={
                summary.value
                  ? `${summary.value.startDate} to ${summary.value.endDate}`
                  : 'Dataset summary'
              }
            />
            <StatBlock
              label="Missing values"
              value={missing === undefined ? '—' : missing.toLocaleString()}
              note={
                summary.value
                  ? `${summary.value.features.length} declared features`
                  : 'Missingness across features'
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
            <Panel
              title="Recorded series"
              eyebrow="Observation history"
              aside={
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#778286]">
                  <span className="size-2 rounded-full bg-[#2d706a]" />
                  {metric ?? 'NO MEASURED FEATURE'}
                </div>
              }
            >
              {observations.loading && !observations.value ? (
                <div className="p-5">
                  <LoadingState />
                </div>
              ) : observations.error ? (
                <div className="p-5">
                  <ErrorState message={observations.error} onRetry={refresh} />
                </div>
              ) : chartRows.length < 2 ? (
                <EmptyState
                  title="Not enough observations"
                  detail="At least two returned points are needed to draw a historical series. No values are estimated here."
                />
              ) : (
                <div className="px-3 pb-3 pt-5">
                  <div className="mb-2 flex items-center justify-between px-3">
                    <div>
                      <div className="eyebrow">Last recorded value</div>
                      <div className="mono mt-1 text-[25px] font-medium tracking-[-.05em]">
                        {latest?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {movement !== undefined && (
                      <div
                        className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] ${movement >= 0 ? 'bg-[#e3eee7] text-[#356b4f]' : 'bg-[#f4e5e1] text-[#9b4d43]'}`}
                      >
                        {movement >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {Math.abs(movement).toFixed(2)}% vs prior observation
                      </div>
                    )}
                  </div>
                  <div
                    className="data-grid h-[270px] w-full rounded-lg p-2"
                    role="img"
                    aria-label={`${metric ?? 'Historical'} recorded market observations`}
                    data-testid="chart-market-overview"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartRows}
                        margin={{ top: 12, right: 14, bottom: 2, left: 0 }}
                      >
                        <CartesianGrid stroke="#d9ddd6" strokeDasharray="2 5" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#87908d', fontSize: 9, fontFamily: 'DM Mono' }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={40}
                        />
                        <YAxis
                          domain={['dataMin - 20', 'dataMax + 20']}
                          tick={{ fill: '#87908d', fontSize: 9, fontFamily: 'DM Mono' }}
                          tickLine={false}
                          axisLine={false}
                          width={48}
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
                          type="monotone"
                          dataKey="value"
                          name={metric ?? 'Observed'}
                          stroke="#2d706a"
                          strokeWidth={2.2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#dc9c60', stroke: '#fff' }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-3 font-mono text-[9px] text-[#838d8d]">
                    <span>RECORDED OBSERVATIONS ONLY</span>
                    <span>{chartRows.length} points in selected range</span>
                  </div>
                </div>
              )}
            </Panel>
            <div className="space-y-5">
              <Panel title="Coverage check" eyebrow="Data quality">
                {summary.error ? (
                  <div className="p-4">
                    <ErrorState message={summary.error} onRetry={refresh} />
                  </div>
                ) : summary.value ? (
                  <div className="p-5">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="mono text-[25px] font-medium">
                          {summary.value.features.length}
                        </span>
                        <span className="ml-2 text-[11px] text-[#768184]">declared features</span>
                      </div>
                      <div className="mono text-[10px] text-[#75827e]">
                        {summary.value.rowCount.toLocaleString()} rows
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {summary.value.features.slice(0, 6).map((feature) => {
                        const missingCount = summary.value?.missingValues[feature];
                        const rowCount = summary.value?.rowCount ?? 0;
                        const ratio =
                          missingCount !== undefined && rowCount
                            ? missingCount / rowCount
                            : undefined;
                        return (
                          <div
                            key={feature}
                            className="grid grid-cols-[1fr_40px_70px] items-center gap-2"
                          >
                            <span className="truncate text-[11px] text-[#45545a]">{feature}</span>
                            <span className="mono text-right text-[10px] text-[#737f81]">
                              {missingCount === undefined ? '—' : missingCount}
                            </span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#e8e6df]">
                              <div
                                className="h-full rounded-full bg-[#d49a67]"
                                style={{
                                  width:
                                    ratio === undefined ? '0%' : `${Math.min(100, ratio * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-[#eee9df] pt-3 text-[10px] text-[#7d8785]">
                      <ScanLine size={13} className="text-[#39796d]" /> Counts come directly from
                      the dataset summary.
                    </div>
                  </div>
                ) : summary.loading ? (
                  <div className="p-4">
                    <LoadingState />
                  </div>
                ) : (
                  <EmptyState
                    title="Summary not available"
                    detail="No dataset summary was returned for this market."
                  />
                )}
              </Panel>
              <Panel title="Research set" eyebrow="Workspace scope">
                <div className="divide-y divide-[#eee9df]">
                  <div className="flex items-center gap-3 p-4">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#e6eee9] text-[#34736a]">
                      <Layers3 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold">
                        {markets.value?.length ?? 0} market instruments
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#828c8d]">
                        Returned by configured source
                      </div>
                    </div>
                    <Database size={14} className="text-[#95a09c]" />
                  </div>
                  <div className="p-4">
                    <div className="eyebrow">Selected instrument</div>
                    <div className="mt-1.5 text-[12px] font-semibold">
                      {market?.name ?? 'No market selected'}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[#798587]">
                      {summary.value?.datasetName ?? 'Awaiting dataset metadata'}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
}
