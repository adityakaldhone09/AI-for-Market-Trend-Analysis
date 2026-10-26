import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  History,
  Play,
  RefreshCw,
  Scale,
  Settings,
  Shield,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { marketService } from '@/features/market/service';
import type { Backtest } from '@/features/market/types';
import { useWorkspace } from '@/features/market/WorkspaceContext';

export function BacktestPage() {
  const { market } = useWorkspace();
  const [strategyType, setStrategyType] = useState('trend_following');
  const [fastMa, setFastMa] = useState(20);
  const [slowMa, setSlowMa] = useState(50);
  const [costPct, setCostPct] = useState(0.05);
  const [initialCapital, setInitialCapital] = useState(1000000);

  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = () => {
    setLoading(true);
    setError(null);
    const sym = market?.symbol || 'NIFTY50';
    marketService
      .backtest({
        symbol: sym,
        strategy_type: strategyType,
        initial_capital: initialCapital,
        transaction_cost_pct: costPct,
        fast_ma_period: fastMa,
        slow_ma_period: slowMa,
      })
      .then((res) => {
        setBacktest(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Backtest execution failed.');
        setLoading(false);
      });
  };

  useEffect(() => {
    runTest();
  }, [market?.symbol]);

  return (
    <div className="page-enter space-y-6">
      {/* Title */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[#0984E3]">Quantitative Strategy Research</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              Next-Bar Execution
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1E272E]">
            Historical Strategy Backtesting
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Simulate rule-based strategies over historical NIFTY 50 daily candles with next-session execution and modeled friction costs.
          </p>
        </div>
      </div>

      {/* Strategy Control Panel */}
      <div className="surface p-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="size-4 text-[#0984E3]" />
          <h2 className="text-sm font-bold text-[#1E272E]">Strategy Parameters & Model Assumptions</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Strategy Selector */}
          <div>
            <label className="eyebrow block">Strategy Model</label>
            <select
              value={strategyType}
              onChange={(e) => setStrategyType(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#0984E3] focus:outline-none"
            >
              <option value="trend_following">MA Crossover (Trend Following)</option>
              <option value="rsi_momentum">RSI Momentum Confirmation</option>
              <option value="trend_volatility_filtered">Trend + Volatility ATR Filter</option>
            </select>
          </div>

          {/* Fast MA Period */}
          <div>
            <label className="eyebrow block">Fast MA Period: {fastMa}</label>
            <input
              type="range"
              min={5}
              max={50}
              value={fastMa}
              onChange={(e) => setFastMa(Number(e.target.value))}
              className="mt-2.5 w-full accent-[#0984E3]"
            />
          </div>

          {/* Slow MA Period */}
          <div>
            <label className="eyebrow block">Slow MA Period: {slowMa}</label>
            <input
              type="range"
              min={20}
              max={200}
              value={slowMa}
              onChange={(e) => setSlowMa(Number(e.target.value))}
              className="mt-2.5 w-full accent-[#0984E3]"
            />
          </div>

          {/* Transaction Cost % */}
          <div>
            <label className="eyebrow block">Friction / Costs (bps): {(costPct * 100).toFixed(0)} bps</label>
            <select
              value={costPct}
              onChange={(e) => setCostPct(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#0984E3] focus:outline-none"
            >
              <option value={0.02}>2 bps (Institutional)</option>
              <option value={0.05}>5 bps (Standard Brokerage/Taxes)</option>
              <option value={0.1}>10 bps (Conservative with Slippage)</option>
            </select>
          </div>

          {/* Run Button */}
          <div className="flex items-end">
            <button
              onClick={runTest}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0984E3] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0773c5] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
              Execute Simulation
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-[#0984E3]" />
          <p className="font-medium">Simulating daily bar execution, slippage, and position accounting...</p>
        </div>
      ) : error || !backtest ? (
        <div className="surface border-red-200 bg-red-50/50 p-6 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-red-600" />
            <div>
              <h3 className="font-semibold">Backtest Execution Failed</h3>
              <p className="text-sm text-red-700">{error || 'Simulation could not complete.'}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="surface p-3.5">
              <div className="eyebrow">Strategy Return</div>
              <div
                className={`mt-1 font-mono text-xl font-bold ${
                  backtest.metrics.total_return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {backtest.metrics.total_return_pct > 0 ? `+${backtest.metrics.total_return_pct}` : backtest.metrics.total_return_pct}%
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">CAGR: {backtest.metrics.cagr_pct}%</div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Benchmark (Buy & Hold)</div>
              <div
                className={`mt-1 font-mono text-xl font-bold ${
                  backtest.metrics.benchmark_return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {backtest.metrics.benchmark_return_pct > 0 ? `+${backtest.metrics.benchmark_return_pct}` : backtest.metrics.benchmark_return_pct}%
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Alpha: {backtest.metrics.alpha_pct > 0 ? `+${backtest.metrics.alpha_pct}` : backtest.metrics.alpha_pct}%
              </div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Sharpe Ratio</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#1E272E]">
                {backtest.metrics.sharpe_ratio}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Sortino: {backtest.metrics.sortino_ratio}
              </div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Max Drawdown</div>
              <div className="mt-1 font-mono text-xl font-bold text-rose-600">
                -{backtest.metrics.max_drawdown_pct}%
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">Peak-to-trough decline</div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Win Rate</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-800">
                {backtest.metrics.win_rate_pct}%
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {backtest.metrics.winning_trades}W / {backtest.metrics.losing_trades}L (PF: {backtest.metrics.profit_factor})
              </div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Ending Capital</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#0984E3]">
                ₹{backtest.metrics.ending_capital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Fees paid: ₹{backtest.metrics.total_fees_paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="surface p-5">
            <div className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 md:flex-row md:items-center">
              <div>
                <h3 className="text-sm font-bold text-[#1E272E]">Cumulative Equity vs Buy & Hold Benchmark</h3>
                <p className="text-xs text-slate-500">
                  Initial Capital: ₹{backtest.metrics.initial_capital.toLocaleString('en-IN')} • Period: {backtest.period_start} to {backtest.period_end}
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="flex items-center gap-1.5 text-[#0984E3]">
                  <span className="size-2 rounded-full bg-[#0984E3]" /> Strategy Equity
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="size-2 rounded-full bg-slate-400" /> NIFTY 50 Benchmark
                </span>
              </div>
            </div>

            <div className="mt-4 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={backtest.equity_curve} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickMargin={8} />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
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
                    formatter={(v: any, name: any) => [
                      `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
                      name === 'strategy_equity' ? 'Strategy' : 'NIFTY 50 Benchmark',
                    ]}
                  />
                  <Line type="monotone" dataKey="strategy_equity" stroke="#0984E3" strokeWidth={2.2} dot={false} name="strategy_equity" />
                  <Line type="monotone" dataKey="benchmark_equity" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="benchmark_equity" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade History Log */}
          <div className="surface p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E272E]">Chronological Trade Log</h3>
                <p className="text-xs text-slate-500">
                  Total executed trades: {backtest.trades.length} with recorded entry/exit and PnL
                </p>
              </div>
              <History className="size-4 text-slate-400" />
            </div>

            <div className="mt-4 max-h-[300px] overflow-y-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Entry Date</th>
                    <th className="pb-2 text-right">Entry Price</th>
                    <th className="pb-2">Exit Date</th>
                    <th className="pb-2 text-right">Exit Price</th>
                    <th className="pb-2 text-right">Shares</th>
                    <th className="pb-2 text-right">Net PnL</th>
                    <th className="pb-2 text-right">Return %</th>
                    <th className="pb-2 text-center">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backtest.trades.map((t) => (
                    <tr key={t.trade_id} className="hover:bg-slate-50/50">
                      <td className="py-2 text-slate-400">{t.trade_id}</td>
                      <td className="py-2 text-slate-700">{t.entry_date}</td>
                      <td className="py-2 text-right text-slate-700">₹{t.entry_price.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-slate-700">{t.exit_date}</td>
                      <td className="py-2 text-right text-slate-700">₹{t.exit_price.toLocaleString('en-IN')}</td>
                      <td className="py-2 text-right text-slate-700">{t.shares}</td>
                      <td className={`py-2 text-right font-bold ${t.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.pnl >= 0 ? `+₹${t.pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(t.pnl).toLocaleString('en-IN')}`}
                      </td>
                      <td className={`py-2 text-right font-semibold ${t.return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.return_pct > 0 ? `+${t.return_pct}` : t.return_pct}%
                      </td>
                      <td className="py-2 text-center">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-slate-600">
                          {t.exit_reason.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
