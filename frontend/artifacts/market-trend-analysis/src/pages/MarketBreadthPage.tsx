import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Flame,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { marketService } from '@/features/market/service';
import type { MarketBreadth, SectorsPerformance } from '@/features/market/types';

export function MarketBreadthPage() {
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [sectors, setSectors] = useState<SectorsPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([marketService.marketBreadth(), marketService.sectorsPerformance()])
      .then(([b, s]) => {
        setBreadth(b);
        setSectors(s);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Market breadth fetch failed.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <div className="surface p-8 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-[#0984E3]" />
          <p className="font-medium">Aggregating NIFTY 50 Constituent Breadth & Official Sector Performance...</p>
        </div>
      </div>
    );
  }

  if (error || !breadth || !sectors) {
    return (
      <div className="page-enter space-y-6">
        <div className="surface border-red-200 bg-red-50/50 p-6 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-red-600" />
            <div>
              <h3 className="font-semibold">Market Breadth Unavailable</h3>
              <p className="text-sm text-red-700">{error || 'Could not load constituent and sector datasets.'}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const advPct = ((breadth.advances / Math.max(breadth.total_constituents, 1)) * 100).toFixed(0);
  const decPct = ((breadth.declines / Math.max(breadth.total_constituents, 1)) * 100).toFixed(0);

  return (
    <div className="page-enter space-y-6">
      {/* Title */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[#0984E3]">Market Internals & Context</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-800">
              Phase 2 Scope
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1E272E]">
            NIFTY 50 Market Breadth & Sector Analysis
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Constituent Advance/Decline Participation • Moving Average Breadth • NSE Official Sector Relative Strength
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* India VIX & Breadth Overview Header Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* India VIX Card */}
        {sectors.vix_context && (
          <div className="surface p-4">
            <div className="eyebrow flex items-center justify-between">
              <span>India VIX Volatility</span>
              <Flame className="size-3.5 text-amber-500" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-[#1E272E]">
              {sectors.vix_context.current_value.toFixed(2)}
            </div>
            <div
              className={`mt-1 flex items-center gap-1 font-mono text-xs font-semibold ${
                sectors.vix_context.change_points <= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {sectors.vix_context.change_points > 0 ? `+${sectors.vix_context.change_points}` : sectors.vix_context.change_points} pts ({sectors.vix_context.change_pct > 0 ? `+${sectors.vix_context.change_pct}` : sectors.vix_context.change_pct}%)
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500 capitalize">
              Regime: <span className="font-semibold text-slate-700">{sectors.vix_context.regime.replace('_', ' ')}</span>
            </div>
          </div>
        )}

        {/* Advances / Declines Ratio */}
        <div className="surface p-4">
          <div className="eyebrow">A/D Ratio</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#1E272E]">
            {breadth.advance_decline_ratio.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-xs font-semibold">
            <span className="text-emerald-600">{breadth.advances} Adv ({advPct}%)</span>
            <span className="text-slate-300">/</span>
            <span className="text-red-600">{breadth.declines} Dec ({decPct}%)</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Signal: <span className="font-semibold capitalize text-slate-700">{breadth.breadth_signal.replace('_', ' ')}</span>
          </div>
        </div>

        {/* % Above 50 SMA */}
        <div className="surface p-4">
          <div className="eyebrow">Above 50-day SMA</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#0984E3]">
            {breadth.pct_above_sma50.toFixed(0)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Intermediate constituent trend participation
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-[#0984E3]" style={{ width: `${breadth.pct_above_sma50}%` }} />
          </div>
        </div>

        {/* % Above 200 SMA */}
        <div className="surface p-4">
          <div className="eyebrow">Above 200-day SMA</div>
          <div className="mt-2 font-mono text-2xl font-bold text-indigo-600">
            {breadth.pct_above_sma200.toFixed(0)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Long-term structural bull market breath
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-indigo-600" style={{ width: `${breadth.pct_above_sma200}%` }} />
          </div>
        </div>
      </div>

      {/* Sector Relative Strength Table */}
      <div className="surface p-5">
        <div className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-[#1E272E]">Official Sector Indices vs NIFTY 50 Benchmark</h2>
            <p className="text-xs text-slate-500">
              Benchmark NIFTY 50: {sectors.benchmark_return_1d >= 0 ? `+${sectors.benchmark_return_1d}` : sectors.benchmark_return_1d}% (Close: ₹{sectors.benchmark_close.toLocaleString('en-IN')})
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            {sectors.leading_sector && (
              <span className="flex items-center gap-1 text-emerald-600">
                <TrendingUp size={14} /> Leader: {sectors.leading_sector}
              </span>
            )}
            {sectors.lagging_sector && (
              <span className="flex items-center gap-1 text-red-600">
                <TrendingDown size={14} /> Laggard: {sectors.lagging_sector}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                <th className="pb-2 font-medium">Sector Index</th>
                <th className="pb-2 text-right font-medium">Current Close</th>
                <th className="pb-2 text-right font-medium">1-Day %</th>
                <th className="pb-2 text-right font-medium">1-Week %</th>
                <th className="pb-2 text-right font-medium">1-Month %</th>
                <th className="pb-2 text-right font-medium">RS vs NIFTY 50</th>
                <th className="pb-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sectors.sectors.map((sec) => (
                <tr key={sec.symbol} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-sans font-semibold text-slate-800">
                    {sec.name} <span className="font-mono text-[10px] text-slate-400">({sec.symbol})</span>
                  </td>
                  <td className="py-2.5 text-right text-slate-700">₹{sec.close.toLocaleString('en-IN')}</td>
                  <td className={`py-2.5 text-right font-semibold ${sec.change_1d_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {sec.change_1d_pct > 0 ? `+${sec.change_1d_pct}` : sec.change_1d_pct}%
                  </td>
                  <td className={`py-2.5 text-right ${sec.change_1w_pct && sec.change_1w_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {sec.change_1w_pct != null ? `${sec.change_1w_pct > 0 ? '+' : ''}${sec.change_1w_pct}%` : '—'}
                  </td>
                  <td className={`py-2.5 text-right ${sec.change_1m_pct && sec.change_1m_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {sec.change_1m_pct != null ? `${sec.change_1m_pct > 0 ? '+' : ''}${sec.change_1m_pct}%` : '—'}
                  </td>
                  <td className={`py-2.5 text-right font-bold ${sec.relative_strength_vs_nifty_1d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {sec.relative_strength_vs_nifty_1d > 0 ? `+${sec.relative_strength_vs_nifty_1d}` : sec.relative_strength_vs_nifty_1d}%
                  </td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        sec.outperforming ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {sec.outperforming ? 'Outperforming' : 'Lagging'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Gainers & Losers Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Gainers */}
        <div className="surface p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowUp className="size-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#1E272E]">Top Constituent Gainers</h3>
          </div>
          <div className="mt-3 divide-y divide-slate-100 font-mono text-xs">
            {breadth.top_gainers.map((item) => (
              <div key={item.symbol} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-sans font-semibold text-slate-800">{item.name}</span>
                  <div className="text-[10px] text-slate-400">Weight: {item.weight}%</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600">+{item.change_pct}%</div>
                  <div className="text-[10px] text-slate-500">₹{item.close.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="surface p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowDown className="size-4 text-red-600" />
            <h3 className="text-sm font-bold text-[#1E272E]">Top Constituent Losers</h3>
          </div>
          <div className="mt-3 divide-y divide-slate-100 font-mono text-xs">
            {breadth.top_losers.map((item) => (
              <div key={item.symbol} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-sans font-semibold text-slate-800">{item.name}</span>
                  <div className="text-[10px] text-slate-400">Weight: {item.weight}%</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">{item.change_pct}%</div>
                  <div className="text-[10px] text-slate-500">₹{item.close.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
