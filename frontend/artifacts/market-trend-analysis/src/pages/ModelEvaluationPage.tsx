import { useEffect, useState } from 'react';
import { BadgeCheck, ClipboardCheck, FlaskConical, TriangleAlert } from 'lucide-react';
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

export function ModelEvaluationPage() {
  const { mode, models, evaluation, runEvaluation, refresh, dateRange } = useWorkspace();
  const [modelId, setModelId] = useState('');
  const selected = models.value?.find((model) => String(model.id) === modelId) ?? models.value?.[0];
  useEffect(() => {
    if (mode === 'demo' && models.value?.length && !evaluation.value && !evaluation.loading) {
      void runEvaluation(String(models.value[0].id));
    }
  }, [mode, models.value, evaluation.value, evaluation.loading, runEvaluation]);
  const submit = () => {
    if (selected) void runEvaluation(String(selected.id));
  };
  const report = evaluation.value;
  return (
    <>
      <PageHeading
        overline="Validation / returned model metrics"
        title="Model evaluation"
        description="Review metrics and aligned actual-versus-predicted values returned by the evaluation service. A metric is evidence about a specified period, not a universal quality guarantee."
      />
      <div className="mb-5">
        <RangeControls />
      </div>
      <div
        className="mb-5 flex items-start gap-3 rounded-xl border border-[#d7ddd3] bg-[#edf2e9] px-4 py-3.5"
        role="note"
      >
        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[#778647]" />
        <p className="m-0 text-[11px] leading-relaxed text-[#5f6d52]">
          <strong className="font-semibold">Context matters.</strong> Compare metrics only alongside
          the evaluation period, target definition, sample size, and validation methodology supplied
          by your backend. This interface does not independently calculate or endorse scores.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Panel
            title="Actual vs predicted"
            eyebrow="Returned evaluation points"
            aside={
              report && (
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-[9px] tracking-wide ${mode === 'demo' ? 'bg-[#f3e6d7] text-[#845630]' : 'bg-[#dcebe4] text-[#326450]'}`}
                >
                  {mode === 'demo' ? 'ILLUSTRATIVE EXAMPLE' : 'API RESULT'}
                </span>
              )
            }
          >
            {evaluation.loading ? (
              <div className="p-5">
                <LoadingState label="Loading evaluation results" />
              </div>
            ) : evaluation.error ? (
              <div className="p-5">
                <ErrorState message={evaluation.error} onRetry={submit} />
              </div>
            ) : !report ? (
              <EmptyState
                title="No evaluation loaded"
                detail={
                  mode === 'demo'
                    ? 'An illustrative report will be shown when the static fixture is available.'
                    : 'Select a model and request an evaluation to display backend-returned metrics.'
                }
              />
            ) : (
              <>
                {report.values?.length ? (
                  <div className="px-3 pb-3 pt-5">
                    <div
                      className="data-grid h-[330px] rounded-lg p-2"
                      role="img"
                      aria-label="Returned actual and predicted evaluation values"
                      data-testid="chart-model-evaluation"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={report.values}
                          margin={{ top: 10, right: 16, bottom: 3, left: 0 }}
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
                            domain={['dataMin - 25', 'dataMax + 25']}
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
                            dataKey="actual"
                            name="Actual"
                            type="monotone"
                            stroke="#2d706a"
                            strokeWidth={2.1}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                          <Line
                            dataKey="predicted"
                            name="Predicted"
                            type="monotone"
                            stroke="#c27e4e"
                            strokeWidth={1.9}
                            strokeDasharray="5 3"
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 px-3 font-mono text-[9px] text-[#7c8887]">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-[2px] w-4 bg-[#2d706a]" />
                        ACTUAL
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-[2px] w-4 border-t border-dashed border-[#c27e4e]" />
                        PREDICTED
                      </span>
                      <span className="ml-auto">{report.values.length} aligned points</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Point comparison not supplied"
                    detail="The evaluation response includes metrics but no actual-versus-predicted values."
                  />
                )}
                <div className="grid grid-cols-1 gap-3 border-t border-[#eee9df] px-5 py-4 md:grid-cols-3">
                  <div>
                    <div className="eyebrow">Model</div>
                    <div className="mt-1 text-[11px] font-semibold">{report.modelName}</div>
                  </div>
                  <div>
                    <div className="eyebrow">Version</div>
                    <div className="mono mt-1 text-[11px]">{report.version}</div>
                  </div>
                  <div>
                    <div className="eyebrow">Evaluation period</div>
                    <div className="mono mt-1 text-[10px]">{report.period}</div>
                  </div>
                </div>
              </>
            )}
          </Panel>
          <Panel
            title="Returned metrics"
            eyebrow="As supplied by evaluation response"
            aside={<ClipboardCheck size={15} className="text-[#528070]" />}
          >
            {evaluation.loading ? (
              <div className="p-4">
                <LoadingState />
              </div>
            ) : evaluation.error ? (
              <div className="p-4">
                <ErrorState message={evaluation.error} onRetry={submit} />
              </div>
            ) : report && Object.keys(report.metrics).length ? (
              <div className="grid grid-cols-1 divide-y divide-[#eee9df] md:grid-cols-2 lg:grid-cols-4 lg:divide-x">
                {Object.entries(report.metrics).map(([name, value]) => (
                  <div key={name} className="min-w-0 p-4">
                    <div className="eyebrow truncate">{name}</div>
                    <div className="mono mt-2 truncate text-[21px] font-medium tracking-[-.04em]">
                      {value.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                    </div>
                    <div className="mt-1 text-[9px] text-[#89918e]">source metric</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No metrics returned"
                detail="The evaluation response did not contain metric values."
              />
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Evaluation request" eyebrow="Model selection">
            <div className="space-y-4 p-5">
              {models.loading && !models.value ? (
                <LoadingState label="Loading available models" />
              ) : models.error ? (
                <ErrorState message={models.error} onRetry={refresh} />
              ) : models.value?.length ? (
                <>
                  <div>
                    <label
                      htmlFor="evaluation-model"
                      className="mb-1.5 block text-[10px] font-semibold text-[#627176]"
                    >
                      Model
                    </label>
                    <select
                      id="evaluation-model"
                      aria-label="Evaluation model"
                      data-testid="select-evaluation-model"
                      value={selected ? String(selected.id) : ''}
                      onChange={(event) => setModelId(event.target.value)}
                      className="focus-ring w-full rounded-lg border border-[#ded9cf] bg-white px-3 py-2.5 text-[12px] font-semibold"
                    >
                      {models.value.map((model) => (
                        <option key={model.id} value={String(model.id)}>
                          {model.name} · {model.version}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg bg-[#f5f2eb] p-3">
                    <div className="eyebrow">Selected period</div>
                    <div className="mono mt-1.5 text-[10px]">
                      {dateRange.startDate || 'Dataset start'} —{' '}
                      {dateRange.endDate || 'Dataset end'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={submit}
                    data-testid="button-run-evaluation"
                    disabled={evaluation.loading || !selected}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6963] px-4 py-3 text-[11px] font-bold text-white transition hover:bg-[#255a55] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <FlaskConical size={15} />
                    {mode === 'demo' ? 'Load illustrative report' : 'Request evaluation'}
                  </button>
                  {mode === 'demo' && (
                    <div className="flex gap-2 rounded-lg bg-[#f6f1e8] p-3 text-[10px] leading-relaxed text-[#826747]">
                      <BadgeCheck size={13} className="mt-0.5 shrink-0" />
                      This fixed report is an example fixture, not a live model evaluation.
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="No models available"
                  detail="The configured service returned no models."
                />
              )}
            </div>
          </Panel>
          <Panel title="Interpreting the report" eyebrow="Evaluation note">
            <div className="space-y-3 p-5 text-[11px] leading-relaxed text-[#68777b]">
              <p className="m-0">
                Metric names and values are displayed exactly as returned. Lower or higher is not
                assumed to be better.
              </p>
              <p className="m-0">
                Predicted points are model outputs; actual points are recorded observations in the
                selected evaluation window.
              </p>
              <p className="m-0">
                If alignment or period context is missing, request clarification from the source
                before drawing conclusions.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
