import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Coins,
  History,
  Lock,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react';
import { marketService } from '@/features/market/service';
import type { PaperAccount } from '@/features/market/types';
import { useWorkspace } from '@/features/market/WorkspaceContext';

export function PaperTradingPage() {
  const { market } = useWorkspace();
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Order ticket state
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderQty, setOrderQty] = useState(10);
  const [orderType, setOrderType] = useState('MARKET');
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const fetchAccount = () => {
    setError(null);
    marketService
      .paperAccount()
      .then((acc) => {
        setAccount(acc);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Paper trading query failed.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitting(true);
    setOrderMessage(null);
    const sym = market?.symbol || 'NIFTY50';

    marketService
      .placePaperOrder({
        symbol: sym,
        side: orderSide,
        quantity: orderQty,
        order_type: orderType,
        stop_loss: stopLoss,
      })
      .then((order) => {
        setOrderMessage(`Order ${order.order_id} filled: ${order.side} ${order.quantity} ${order.symbol} @ ₹${order.fill_price}`);
        setOrderSubmitting(false);
        fetchAccount();
      })
      .catch((err) => {
        setOrderMessage(`Order Rejected: ${err instanceof Error ? err.message : 'Execution failed.'}`);
        setOrderSubmitting(false);
      });
  };

  const handleClosePosition = (sym: string) => {
    if (!confirm(`Are you sure you want to close position for ${sym}?`)) return;
    marketService
      .closePaperPosition(sym)
      .then(() => fetchAccount())
      .catch((err) => alert(err instanceof Error ? err.message : 'Failed to close position.'));
  };

  const handleReset = () => {
    if (!confirm('Reset simulated account back to ₹10,00,000 INR initial capital?')) return;
    marketService
      .resetPaperAccount()
      .then((acc) => setAccount(acc))
      .catch((err) => alert(err instanceof Error ? err.message : 'Reset failed.'));
  };

  const handleToggle = () => {
    marketService
      .toggleSimulator()
      .then(() => fetchAccount())
      .catch((err) => alert(err instanceof Error ? err.message : 'Toggle failed.'));
  };

  return (
    <div className="page-enter space-y-6">
      {/* Title */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[#0984E3]">Execution Sandbox</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                account?.simulator_status === 'RUNNING'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Simulator: {account?.simulator_status ?? 'RUNNING'}
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1E272E]">
            Simulated Paper Trading
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Forward-test research strategies with virtual capital, simulated market slippage, and real-time position accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {account?.simulator_status === 'RUNNING' ? <Pause size={13} /> : <Play size={13} />}
            {account?.simulator_status === 'RUNNING' ? 'Pause Simulator' : 'Resume Simulator'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <RotateCcw size={13} /> Reset Capital
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-900">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[#0984E3]" />
          <div className="space-y-1">
            <div className="font-bold">Virtual Simulation Guarantee — Zero Broker Risk</div>
            <p className="leading-relaxed text-sky-800">
              Orders placed here are strictly simulated within local memory and mock state. <strong>No real broker orders or exchange executions are transmitted</strong>. All order fills reflect latest verified NIFTY 50 prices with modeled 0.02% slippage and 0.05% brokerage fees.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-[#0984E3]" />
          <p className="font-medium">Loading virtual portfolio and position marks...</p>
        </div>
      ) : error || !account ? (
        <div className="surface border-red-200 bg-red-50/50 p-6 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-red-600" />
            <div>
              <h3 className="font-semibold">Paper Trading Offline</h3>
              <p className="text-sm text-red-700">{error || 'Simulator could not be initialized.'}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Account Overview Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="surface p-3.5">
              <div className="eyebrow">Total Portfolio Equity</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#1E272E]">
                ₹{account.total_equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Initial: ₹{account.initial_capital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Available Cash</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#0984E3]">
                ₹{account.cash_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">Unallocated buying power</div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Open Market Value</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-800">
                ₹{account.portfolio_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">{account.positions_count} open position(s)</div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Unrealized PnL</div>
              <div
                className={`mt-1 font-mono text-xl font-bold ${
                  account.total_unrealized_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {account.total_unrealized_pnl >= 0 ? `+₹${account.total_unrealized_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(account.total_unrealized_pnl).toLocaleString('en-IN')}`}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">Floating return mark</div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Realized PnL</div>
              <div
                className={`mt-1 font-mono text-xl font-bold ${
                  account.total_realized_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {account.total_realized_pnl >= 0 ? `+₹${account.total_realized_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(account.total_realized_pnl).toLocaleString('en-IN')}`}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">Closed trade gains</div>
            </div>

            <div className="surface p-3.5">
              <div className="eyebrow">Total Return %</div>
              <div
                className={`mt-1 font-mono text-xl font-bold ${
                  account.total_return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {account.total_return_pct > 0 ? `+${account.total_return_pct}` : account.total_return_pct}%
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">Net virtual performance</div>
            </div>
          </div>

          {/* Order Ticket & Active Positions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Order Ticket Panel */}
            <div className="surface p-5 lg:col-span-1">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Coins className="size-4 text-[#0984E3]" />
                <h3 className="text-sm font-bold text-[#1E272E]">Simulated Order Ticket</h3>
              </div>

              <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4">
                {/* Instrument */}
                <div>
                  <label className="eyebrow block">Instrument</label>
                  <div className="mt-1 font-mono text-sm font-bold text-slate-800">
                    {market?.symbol || 'NIFTY50'}
                  </div>
                </div>

                {/* Side Selection */}
                <div>
                  <label className="eyebrow block">Order Side</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderSide('BUY')}
                      className={`rounded-lg py-2 font-mono text-xs font-bold transition-all ${
                        orderSide === 'BUY'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSide('SELL')}
                      className={`rounded-lg py-2 font-mono text-xs font-bold transition-all ${
                        orderSide === 'SELL'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      SELL / FLAT
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="eyebrow block">Quantity (Units)</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-800 focus:border-[#0984E3] focus:outline-none"
                  />
                </div>

                {/* Stop Loss (Optional) */}
                <div>
                  <label className="eyebrow block">Protective Stop Loss (₹ Optional)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 22500"
                    value={stopLoss ?? ''}
                    onChange={(e) => setStopLoss(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:border-[#0984E3] focus:outline-none"
                  />
                </div>

                {/* Order Feedback Alert */}
                {orderMessage && (
                  <div className={`rounded-lg p-2.5 text-xs font-medium ${
                    orderMessage.includes('filled') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {orderMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={orderSubmitting || account.simulator_status === 'PAUSED'}
                  className={`w-full rounded-lg py-2.5 font-mono text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                    orderSide === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {orderSubmitting ? 'Transmitting Simulated Fill...' : `Place Virtual ${orderSide} Order`}
                </button>
              </form>
            </div>

            {/* Active Positions Table */}
            <div className="surface p-5 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1E272E]">Simulated Open Positions</h3>
                  <p className="text-xs text-slate-500">Live mark-to-market positions held in simulator</p>
                </div>
                <Wallet className="size-4 text-slate-400" />
              </div>

              {account.positions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active virtual positions. Use the order ticket on the left to enter simulated exposure.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400">
                        <th className="pb-2">Symbol</th>
                        <th className="pb-2 text-right">Shares</th>
                        <th className="pb-2 text-right">Entry Price</th>
                        <th className="pb-2 text-right">Current Price</th>
                        <th className="pb-2 text-right">Market Value</th>
                        <th className="pb-2 text-right">Unrealized PnL</th>
                        <th className="pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {account.positions.map((pos) => (
                        <tr key={pos.symbol} className="hover:bg-slate-50/50">
                          <td className="py-3 font-sans font-bold text-slate-800">{pos.symbol}</td>
                          <td className="py-3 text-right">{pos.shares}</td>
                          <td className="py-3 text-right">₹{pos.entry_price.toLocaleString('en-IN')}</td>
                          <td className="py-3 text-right font-semibold">₹{pos.current_price.toLocaleString('en-IN')}</td>
                          <td className="py-3 text-right">₹{pos.market_value.toLocaleString('en-IN')}</td>
                          <td
                            className={`py-3 text-right font-bold ${
                              pos.unrealized_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {pos.unrealized_pnl >= 0 ? `+₹${pos.unrealized_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(pos.unrealized_pnl).toLocaleString('en-IN')}`} ({pos.unrealized_pnl_pct}%)
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => handleClosePosition(pos.symbol)}
                              className="rounded bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders History Table */}
          <div className="surface p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E272E]">Recent Simulated Orders History</h3>
                <p className="text-xs text-slate-500">Order execution log with modeled transaction fees and fill prices</p>
              </div>
              <History className="size-4 text-slate-400" />
            </div>

            {account.recent_orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No simulated orders recorded yet.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400">
                      <th className="pb-2">Order ID</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2 text-right">Quantity</th>
                      <th className="pb-2 text-right">Fill Price</th>
                      <th className="pb-2 text-right">Friction Fee</th>
                      <th className="pb-2 text-center">Status</th>
                      <th className="pb-2 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {account.recent_orders.map((ord) => (
                      <tr key={ord.order_id} className="hover:bg-slate-50/50">
                        <td className="py-2 text-slate-400">{ord.order_id}</td>
                        <td className="py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              ord.side === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="py-2 font-semibold text-slate-800">{ord.symbol}</td>
                        <td className="py-2 text-right">{ord.quantity}</td>
                        <td className="py-2 text-right font-medium">₹{ord.fill_price.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right text-slate-500">₹{ord.transaction_cost}</td>
                        <td className="py-2 text-center">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-2 text-right text-slate-400 text-[10px]">{ord.created_at.slice(0, 19).replace('T', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
