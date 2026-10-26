import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  HelpCircle,
  Info,
  Radio,
  RefreshCw,
  Scale,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { marketService } from '@/features/market/service';
import type { ResearchSignal } from '@/features/market/types';
import { useWorkspace } from '@/features/market/WorkspaceContext';

export function SignalsPage() {
  const { market } = useWorkspace();
  const [horizon, setHorizon] = useState(5);
  const [signal, setSignal] = useState<ResearchSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignal = () => {
    setLoading(true);
    setError(null);
    const sym = market?.symbol || 'NIFTY50';
    marketService
      .researchSignal(sym, horizon)
      .then((res) => {
        setSignal(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Research signal calculation failed.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSignal();
  }, [market?.symbol, horizon]);

  return (
    <div className="page-enter space-y-6">
      {/* Title & Horizon Selector */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[#0984E3]">Decision Support Framework</span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-800">
              Quantitative Synthesis
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1E272E]">
            Explainable Research Signals
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Factor-weighted research signal combining trend hierarchy, momentum confirmation, volatility filters, and ML consensus.
          </p>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
          {[1, 3, 5, 10].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                horizon === h
                  ? 'bg-[#0984E3] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {h} Session{h > 1 ? 's' : ''}
            </button>
          ))}
          <button
            onClick={fetchSignal}
            className="ml-1 rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
            title="Refresh signal"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SEBI Compliance & Regulatory Boundaries Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <div className="font-bold">SEBI Regulatory Boundaries & Compliance Notice</div>
            <p className="leading-relaxed text-amber-800">
              This platform generates purely quantitative, model-driven <strong>research signals and decision-support analytics</strong> for academic and research evaluation. It does not provide personalized investment advice or buy/sell recommendations governed by SEBI (Investment Advisers) Regulations, 2013 or SEBI (Research Analysts) Regulations, 2014. No trade execution is connected to real exchange venues.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-[#0984E3]" />
          <p className="font-medium">Synthesizing quantitative factors and model consensus...</p>
        </div>
      ) : error || !signal ? (
        <div className="surface border-red-200 bg-red-50/50 p-6 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-red-600" />
            <div>
              <h3 className="font-semibold">Unable to Generate Signal</h3>
              <p className="text-sm text-red-700">{error || 'Data could not be retrieved.'}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Main Signal Verdict Card */}
          <div className="surface-dark p-6">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="eyebrow text-cyan-400">Primary Quantitative Signal • {signal.horizon}</div>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 font-mono text-xl font-extrabold tracking-wide ${
                      signal.signal === 'BULLISH_OUTLOOK'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : signal.signal === 'BEARISH_OUTLOOK'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-slate-700 text-slate-200 border border-slate-600'
                    }`}
                  >
                    {signal.signal === 'BULLISH_OUTLOOK' ? (
                      <TrendingUp size={22} />
                    ) : signal.signal === 'BEARISH_OUTLOOK' ? (
                      <TrendingDown size={22} />
                    ) : (
                      <Compass size={22} />
                    )}
                    {signal.signal.replace('_', ' ')}
                  </span>
                  <span className="rounded-lg bg-slate-800 px-3 py-1 font-mono text-sm text-slate-300">
                    Stance: <span className="font-bold text-white">{signal.stance}</span>
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-xs text-slate-300">
                  {signal.ml_model_consensus}
                </p>
              </div>

              {/* Confidence Gauge & Target Box */}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                <div className="text-center">
                  <div className="eyebrow text-slate-400">Model Confidence</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-cyan-400">
                    {signal.confidence_pct}%
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-700" />
                <div className="text-center">
                  <div className="eyebrow text-slate-400">Target Estimate</div>
                  <div className="mt-1 font-mono text-xl font-bold text-white">
                    ₹{signal.target_price_estimate?.toLocaleString('en-IN') ?? '—'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Expected: {signal.expected_return_pct && signal.expected_return_pct > 0 ? `+${signal.expected_return_pct}` : signal.expected_return_pct}%
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-700" />
                <div className="text-center">
                  <div className="eyebrow text-rose-400">Invalidation Level</div>
                  <div className="mt-1 font-mono text-xl font-bold text-rose-400">
                    ₹{signal.invalidation_level.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">Stop boundary</div>
                </div>
              </div>
            </div>
          </div>

          {/* Factor Breakdown Grid */}
          <div className="surface p-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#1E272E]">Factor Rationale & Evidence Breakdown</h2>
              <p className="text-xs text-slate-500">
                Every signal output is mathematically traceable to specific technical indicators and market observations.
              </p>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {signal.primary_factors.map((factor, idx) => (
                <div key={idx} className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="eyebrow text-[#0984E3]">{factor.category}</span>
                      <span className="font-semibold text-slate-800">{factor.indicator}</span>
                    </div>
                    <p className="text-xs text-slate-600">{factor.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {factor.reading}
                    </span>
                    <span
                      className={`inline-block rounded-md px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        factor.contribution === 'bullish'
                          ? 'bg-emerald-100 text-emerald-800'
                          : factor.contribution === 'bearish'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {factor.contribution}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Invalidation Guidelines */}
          <div className="surface p-5">
            <h3 className="text-sm font-bold text-[#1E272E]">Risk & Invalidation Protocol</h3>
            <p className="mt-1 text-xs text-slate-600">
              A disciplined quantitative outlook always specifies when the thesis is invalid:
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0984E3]" />
                <span>
                  <strong>Invalidation Condition:</strong> If NIFTY 50 prints a daily close beyond the invalidation level of <strong>₹{signal.invalidation_level.toLocaleString('en-IN')}</strong>, the current directional thesis is completely voided.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0984E3]" />
                <span>
                  <strong>Time Decay:</strong> This signal is calibrated for the next {signal.horizon}. If the index does not advance toward the target within this window, time stop rules dictate closing or flattening simulated exposure.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0984E3]" />
                <span>
                  <strong>Volatility Expansion:</strong> In the event of sudden India VIX surge above 20.0, position sizing in research simulations should automatically scale down by at least 50%.
                </span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
