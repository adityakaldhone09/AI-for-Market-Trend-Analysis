import { useMemo, useState } from 'react';
import { FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '@/features/market/WorkspaceContext';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  Pager,
  Panel,
  RangeControls,
} from '@/components/MarketUI';
import type { MarketObservation } from '@/features/market/types';

const noObservationRows: MarketObservation[] = [];
function cellValue(row: Record<string, unknown>, feature: string): string {
  const value = row[feature] ?? (row.features as Record<string, unknown> | undefined)?.[feature];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number')
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  return '—';
}
export function DataExplorerPage() {
  const { summary, observations, refresh } = useWorkspace();
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rows = observations.value ?? noObservationRows;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );
  const features = summary.value?.features ?? [];
  return (
    <>
      <PageHeading
        overline="Dataset / inspection"
        title="Data explorer"
        description="Review metadata, feature completeness, and a bounded preview of the returned rows. The schema is driven by service metadata, not assumed columns."
      />
      <div className="mb-5">
        <RangeControls />
      </div>
      {summary.loading && !summary.value ? (
        <LoadingState label="Loading dataset summary" />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={refresh} />
      ) : (
        summary.value && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Dataset', summary.value.datasetName],
                ['Rows', summary.value.rowCount.toLocaleString()],
                ['Feature count', String(summary.value.features.length)],
                ['Date coverage', `${summary.value.startDate} — ${summary.value.endDate}`],
              ].map(([label, value]) => (
                <div key={label} className="surface min-w-0 px-4 py-3.5">
                  <div className="eyebrow">{label}</div>
                  <div className="mt-2 truncate text-[13px] font-semibold text-[#33434a]">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <Panel
                title="Feature inventory"
                eyebrow="Declared schema"
                aside={
                  <span className="font-mono text-[9px] text-[#7f8988]">
                    {features.length} FEATURES
                  </span>
                }
              >
                {features.length ? (
                  <div className="divide-y divide-[#eee9df]">
                    {features.map((feature) => {
                      const missing = summary.value?.missingValues[feature];
                      const rowsTotal = summary.value?.rowCount ?? 0;
                      const ratio =
                        missing === undefined || !rowsTotal ? undefined : missing / rowsTotal;
                      const stats = summary.value?.statistics[feature];
                      return (
                        <div
                          key={feature}
                          className="grid grid-cols-[minmax(100px,1fr)_90px_minmax(100px,1fr)] items-center gap-3 px-5 py-3.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-semibold text-[#415158]">
                              {feature}
                            </div>
                            <div className="mt-1 text-[9px] text-[#89918e]">
                              summary declaration
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="mono text-[11px] font-medium">
                              {missing === undefined ? '—' : missing.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-[#89918e]">missing</div>
                          </div>
                          <div>
                            <div className="flex justify-between font-mono text-[9px] text-[#798581]">
                              <span>COMPLETENESS</span>
                              <span>
                                {ratio === undefined ? '—' : `${Math.round((1 - ratio) * 100)}%`}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eeeae1]">
                              <div
                                className="h-full rounded-full bg-[#3c786f]"
                                style={{
                                  width:
                                    ratio === undefined
                                      ? '0%'
                                      : `${Math.max(0, 100 - ratio * 100)}%`,
                                }}
                              />
                            </div>
                            <div className="mt-1 truncate text-[9px] text-[#929995]">
                              {stats?.mean === undefined
                                ? 'No mean supplied'
                                : `Mean ${stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No features declared"
                    detail="The dataset summary did not provide a feature list."
                  />
                )}
                <div className="flex items-start gap-2 border-t border-[#eee9df] bg-[#f8f6f0] px-5 py-3 text-[10px] leading-relaxed text-[#7a8583]">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#3b786e]" /> Missing
                  counts and statistics are read directly from the summary response. A dash means
                  the source omitted that field.
                </div>
              </Panel>
              <Panel title="Dataset metadata" eyebrow="Source-provided">
                <div className="divide-y divide-[#eee9df]">
                  <div className="flex justify-between gap-4 px-5 py-4">
                    <span className="text-[11px] text-[#788486]">Dataset name</span>
                    <span className="text-right text-[11px] font-semibold">
                      {summary.value.datasetName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 px-5 py-4">
                    <span className="text-[11px] text-[#788486]">Record count</span>
                    <span className="mono text-[11px] font-medium">
                      {summary.value.rowCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 px-5 py-4">
                    <span className="text-[11px] text-[#788486]">First date</span>
                    <span className="mono text-[11px]">{summary.value.startDate}</span>
                  </div>
                  <div className="flex justify-between gap-4 px-5 py-4">
                    <span className="text-[11px] text-[#788486]">Last date</span>
                    <span className="mono text-[11px]">{summary.value.endDate}</span>
                  </div>
                  <div className="flex justify-between gap-4 px-5 py-4">
                    <span className="text-[11px] text-[#788486]">Preview returned</span>
                    <span className="mono text-[11px]">
                      {observations.value?.length.toLocaleString() ?? '—'} rows
                    </span>
                  </div>
                </div>
              </Panel>
            </div>
            <Panel
              title="Bounded row preview"
              eyebrow="Returned observations"
              aside={
                <div className="flex items-center gap-2">
                  <label htmlFor="page-size" className="text-[10px] text-[#768184]">
                    Rows / page
                  </label>
                  <select
                    id="page-size"
                    aria-label="Rows per page"
                    data-testid="select-page-size"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Math.min(50, Math.max(1, Number(event.target.value))));
                      setRequestedPage(1);
                    }}
                    className="focus-ring rounded-md border border-[#e5dfd3] bg-white px-2 py-1.5 font-mono text-[10px]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <Pager page={page} totalPages={totalPages} onChange={setRequestedPage} />
                </div>
              }
              className="mt-5"
            >
              {observations.loading && !observations.value ? (
                <div className="p-4">
                  <LoadingState />
                </div>
              ) : observations.error ? (
                <div className="p-4">
                  <ErrorState message={observations.error} onRetry={refresh} />
                </div>
              ) : !rows.length ? (
                <EmptyState
                  title="No rows returned"
                  detail="No observations match the current market and date range."
                />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table
                    className="w-full min-w-[620px] text-left text-[11px]"
                    data-testid="table-data-preview"
                  >
                    <thead className="bg-[#f6f3ed] font-mono text-[9px] tracking-[.06em] text-[#7d8989]">
                      <tr>
                        <th className="sticky left-0 bg-[#f6f3ed] px-5 py-3 font-medium">DATE</th>
                        {features.map((feature) => (
                          <th key={feature} className="px-4 py-3 text-right font-medium">
                            {feature.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ece4]">
                      {pageRows.map((row, index) => (
                        <tr
                          key={`${row.date}-${index}`}
                          data-testid={`row-preview-${(page - 1) * pageSize + index}`}
                          className="hover:bg-[#faf8f3]"
                        >
                          <td className="sticky left-0 bg-[#fffefa] px-5 py-3 font-mono text-[#56666c]">
                            {row.date}
                          </td>
                          {features.map((feature) => (
                            <td key={feature} className="mono px-4 py-3 text-right text-[#33444c]">
                              {cellValue(row as unknown as Record<string, unknown>, feature)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between border-t border-[#eee9df] px-5 py-3">
                    <div className="flex items-center gap-2 text-[10px] text-[#818b8b]">
                      <FileSpreadsheet size={13} /> Preview page is capped at 50 returned rows.
                    </div>
                    <Pager page={page} totalPages={totalPages} onChange={setRequestedPage} />
                  </div>
                </div>
              )}
            </Panel>
          </>
        )
      )}
    </>
  );
}
