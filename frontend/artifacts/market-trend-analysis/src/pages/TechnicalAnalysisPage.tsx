import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  Calendar,
  Compass,
  Layers,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { marketService } from '@/features/market/service';
import type { TechnicalAnalysis } from '@/features/market/types';
import { useWorkspace } from '@/features/market/WorkspaceContext';

export function TechnicalAnalysisPage() {
  const { market } = useWorkspace();
  const [data, setData] = useState<TechnicalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTech = () => {
    setLoading(true);
    setError(null);
    const sym = market?.symbol || 'NIFTY50';
    marketService
      .technicalAnalysis(sym)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Technical analysis query failed.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTech();
  }, [market?.symbol]);

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <div className="surface p-8 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-[#0984E3]" />
          <p className="font-medium">Computing NIFTY 50 Technical Indicators & Market Regime...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-enter space-y-6">
        <div className="surface border-red-200 bg-red-50/50 p-6 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-red-600" />
            <div>
              <h3 className="font-semibold">Technical Analysis Unavailable</h3>
              <p className="text-sm text-red-700">{error || 'Unable to compute indicator set.'}</p>
            </div>
          </div>
          <button
            onClick={fetchTech}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  const { indicators, regime, returns, support_resistance, observations } = data;
  const isBullish = regime.regime === 'uptrend';
  const isBearish = regime.regime === 'downtrend';

  return (
    <div className="page-enter space-y-6">
      {/* Header & Instrument Metadata */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[#0984E3]">NSE Benchmark Analytics</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                data.staleness_state === 'fresh'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {data.staleness_state === 'fresh' ? 'Verified Daily Session' : 'Historical Data Record'}
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1E272E]">
            {data.name} ({data.symbol})
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Source: {data.data_source} • Timezone: {data.time_zone} • Cutoff Date: {data.latest_timestamp}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="surface px-4 py-2 text-right">
            <div className="eyebrow">Latest Close</div>
            <div className="font-mono text-xl font-bold text-[#1E272E]">
              ₹{data.latest_close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            {returns.daily_return_pct != null && (
              <div
                className={`flex items-center justify-end gap-1 font-mono text-xs font-semibold ${
                  returns.daily_return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {returns.daily_return_pct >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {returns.daily_return_pct > 0 ? `+${returns.daily_return_pct}` : returns.daily_return_pct}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Index Benchmark Caveat Banner */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-900">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#0984E3]" />
          <div>
            <span className="font-semibold">Benchmark Index Transparency Notice:</span> An index is a calculated benchmark, not a traded stock. Its historical record reflects weighted constituent prices rather than direct traded index volume. Volatility metrics use 21-day rolling returns and official India VIX historical data.
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="surface p-4">
          <div className="eyebrow">Market Regime</div>
          <div className="mt-2 flex items-center gap-2">
            {isBullish ? (
              <TrendingUp className="size-5 text-emerald-600" />
            ) : isBearish ? (
              <TrendingDown className="size-5 text-red-600" />
            ) : (
              <Compass className="size-5 text-sky-600" />
            )}
            <span className="font-semibold text-[#1E272E]">{regime.label}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Confidence: <span className="font-mono font-medium">{(regime.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="surface p-4">
          <div className="eyebrow">RSI (14 Sessions)</div>
          <div className="mt-2 font-mono text-xl font-bold text-[#1E272E]">
            {indicators.rsi_14 != null ? indicators.rsi_14.toFixed(1) : 'N/A'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {indicators.rsi_14 != null && indicators.rsi_14 > 70
              ? 'Overbought territory'
              : indicators.rsi_14 != null && indicators.rsi_14 < 30
                ? 'Oversold territory'
                : 'Neutral momentum band'}
          </div>
        </div>

        <div className="surface p-4">
          <div className="eyebrow">Annualized Volatility</div>
          <div className="mt-2 font-mono text-xl font-bold text-[#1E272E]">
            {indicators.rolling_volatility_annualized != null
              ? `${indicators.rolling_volatility_annualized.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            State: <span className="capitalize">{regime.volatility_state}</span> • ATR: ₹{indicators.atr_14?.toFixed(1) ?? 'N/A'}
          </div>
        </div>

        <div className="surface p-4">
          <div className="eyebrow">Period Returns</div>
          <div className="mt-2 flex justify-between font-mono text-xs">
            <span className="text-slate-500">1-Week:</span>
            <span className={returns.weekly_return_pct && returns.weekly_return_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
              {returns.weekly_return_pct != null ? `${returns.weekly_return_pct > 0 ? '+' : ''}${returns.weekly_return_pct}%` : '—'}
            </span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs">
            <span className="text-slate-500">1-Month:</span>
            <span className={returns.monthly_return_pct && returns.monthly_return_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
              {returns.monthly_return_pct != null ? `${returns.monthly_return_pct > 0 ? '+' : ''}${returns.monthly_return_pct}%` : '—'}
            </span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs">
            <span className="text-slate-500">YTD:</span>
            <span className={returns.ytd_return_pct && returns.ytd_return_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
              {returns.ytd_return_pct != null ? `${returns.ytd_return_pct > 0 ? '+' : ''}${returns.ytd_return_pct}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Historical Chart with Moving Averages & Bollinger Bands */}
      <div className="surface p-5">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-[#1E272E]">Price Action & Moving Average Framework</h2>
            <p className="text-xs text-slate-500">
              Close Price against 20 SMA, 50 SMA, 200 SMA, and 2-Sigma Bollinger Bands
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-[#0984E3]">
              <span className="size-2 rounded-full bg-[#0984E3]" /> Close
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="size-2 rounded-full bg-amber-500" /> 20 SMA
            </span>
            <span className="flex items-center gap-1.5 text-indigo-500">
              <span className="size-2 rounded-full bg-indigo-500" /> 50 SMA
            </span>
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="size-2 rounded-full bg-rose-500" /> 200 SMA
            </span>
          </div>
        </div>

        <div className="mt-4 h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={observations} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} tickMargin={8} />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E272E',
                  color: '#F5F6FA',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
                formatter={(value: any, name: any) => [
                  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  name === 'close' ? 'Close' : name === 'sma_20' ? 'SMA 20' : name === 'sma_50' ? 'SMA 50' : 'SMA 200',
                ]}
              />
              <Line type="monotone" dataKey="close" stroke="#0984E3" strokeWidth={2.2} dot={false} name="close" />
              <Line type="monotone" dataKey="sma_20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="sma_20" />
              <Line type="monotone" dataKey="sma_50" stroke="#6366f1" strokeWidth={1.5} dot={false} name="sma_50" />
              <Line type="monotone" dataKey="sma_200" stroke="#ef4444" strokeWidth={1.8} dot={false} name="sma_200" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub-Charts: RSI & MACD */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* RSI Sub-Chart */}
        <div className="surface p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1E272E]">Relative Strength Index (RSI 14)</h3>
              <p className="text-xs text-slate-500">Overbought: 70 • Oversold: 30</p>
            </div>
            <div className="font-mono text-sm font-bold text-[#0984E3]">
              {indicators.rsi_14?.toFixed(1) ?? '—'}
            </div>
          </div>
          <div className="mt-3 h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={observations} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} hide />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} ticks={[30, 50, 70]} />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="2 2" />
                <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="rsi_14" stroke="#0984E3" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MACD Sub-Chart */}
        <div className="surface p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1E272E]">MACD (12, 26, 9)</h3>
              <p className="text-xs text-slate-500">Momentum Convergence & Divergence</p>
            </div>
            <div className="font-mono text-xs">
              <span className="text-[#0984E3]">MACD: {indicators.macd_line?.toFixed(1) ?? '—'}</span>{' '}
              <span className="text-amber-600">Signal: {indicators.macd_signal?.toFixed(1) ?? '—'}</span>
            </div>
          </div>
          <div className="mt-3 h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={observations} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} hide />
                <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="macd" stroke="#0984E3" strokeWidth={1.6} dot={false} />
                <Line type="monotone" dataKey="macd_signal" stroke="#f59e0b" strokeWidth={1.6} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Support & Resistance Ladder & Regime Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Support & Resistance Ladder */}
        <div className="surface p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1E272E]">Pivot Point & Structure Levels</h3>
              <p className="text-xs text-slate-500">Standard Floor Pivot Levels (Next Session Targets)</p>
            </div>
            <Layers className="size-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-rose-800">
              <span className="font-bold">Resistance 3 (R3)</span>
              <span>₹{support_resistance.r3.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-rose-50/60 px-3 py-2 text-rose-700">
              <span className="font-bold">Resistance 2 (R2)</span>
              <span>₹{support_resistance.r2.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-rose-50/30 px-3 py-2 text-rose-600">
              <span className="font-bold">Resistance 1 (R1)</span>
              <span>₹{support_resistance.r1.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 font-bold text-[#0984E3]">
              <span>Central Pivot (P)</span>
              <span>₹{support_resistance.pivot_point.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-emerald-50/30 px-3 py-2 text-emerald-600">
              <span className="font-bold">Support 1 (S1)</span>
              <span>₹{support_resistance.s1.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2 text-emerald-700">
              <span className="font-bold">Support 2 (S2)</span>
              <span>₹{support_resistance.s2.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
              <span className="font-bold">Support 3 (S3)</span>
              <span>₹{support_resistance.s3.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Regime Rationale & Technical Checklist */}
        <div className="surface p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1E272E]">Market Regime Rationale</h3>
              <p className="text-xs text-slate-500">Heuristic breakdown and moving average status</p>
            </div>
            <Activity className="size-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="eyebrow mb-1 text-slate-500">Classification Details</div>
              <ul className="list-inside list-disc space-y-1 text-slate-700">
                {regime.rationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="rounded-lg border border-slate-100 p-2.5">
                <span className="text-slate-400">Golden Cross:</span>
                <span className={`ml-2 font-bold ${regime.is_golden_cross ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {regime.is_golden_cross ? 'Active (50 > 200)' : 'Inactive'}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 p-2.5">
                <span className="text-slate-400">Death Cross:</span>
                <span className={`ml-2 font-bold ${regime.is_death_cross ? 'text-red-600' : 'text-slate-500'}`}>
                  {regime.is_death_cross ? 'Active (50 < 200)' : 'Inactive'}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 p-2.5">
                <span className="text-slate-400">Price vs 200 SMA:</span>
                <span className="ml-2 font-bold capitalize text-slate-700">
                  {regime.price_vs_sma200 ?? 'N/A'}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 p-2.5">
                <span className="text-slate-400">Bollinger Bandwidth:</span>
                <span className="ml-2 font-bold text-slate-700">
                  {indicators.bollinger_bandwidth?.toFixed(2) ?? '—'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
