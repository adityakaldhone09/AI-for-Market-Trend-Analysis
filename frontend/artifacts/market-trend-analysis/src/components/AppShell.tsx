import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Compass,
  Database,
  Gauge,
  Layers,
  LineChart,
  Menu,
  RotateCw,
  Sliders,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useWorkspace } from '@/features/market/WorkspaceContext';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: BarChart3 },
  { to: '/technical-analysis', label: 'Technical analysis', icon: LineChart },
  { to: '/market-breadth', label: 'Market breadth & sectors', icon: Layers },
  { to: '/research-signals', label: 'Research signals', icon: Activity },
  { to: '/strategy-backtest', label: 'Strategy backtesting', icon: Sliders },
  { to: '/paper-trading', label: 'Paper trading simulator', icon: Wallet },
  { to: '/market-analysis', label: 'Market analysis', icon: LineChart },
  { to: '/forecast', label: 'Forecasts', icon: Compass },
  { to: '/model-evaluation', label: 'Model evaluation', icon: Gauge },
  { to: '/data-explorer', label: 'Data explorer', icon: Database },
];
const titles: Record<string, string> = {
  '/dashboard': 'Market overview',
  '/technical-analysis': 'Technical indicators & regime',
  '/market-breadth': 'Constituent breadth & sector performance',
  '/research-signals': 'Decision support & research signals',
  '/strategy-backtest': 'Historical strategy backtest',
  '/paper-trading': 'Simulated paper trading account',
  '/market-analysis': 'Historical observations',
  '/forecast': 'ML price & return forecasting',
  '/data-explorer': 'Dataset explorer',
  '/model-evaluation': 'Chronological holdout evaluation',
};

export function AppShell() {
  const workspace = useWorkspace();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTitle = titles[location.pathname] ?? 'NIFTY 50 Intelligence';
  const statusText =
    workspace.mode === 'demo'
      ? 'DEMO DATA'
      : workspace.health.value
        ? 'API CONNECTED'
        : workspace.health.error
          ? 'API UNAVAILABLE'
          : 'CONNECTING';
  return (
    <div className="app-shell flex min-h-[100dvh]">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#17212b]/50 md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <div className="grid size-9 place-items-center rounded-xl bg-[#0984E3] text-white">
            <Activity size={19} strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-[var(--font-display)] text-[14px] font-extrabold tracking-[-.04em] text-white">
              NIFTY 50 AI
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-[.14em] text-[#00CEC9]">
              MARKET INTELLIGENCE
            </div>
          </div>
        </div>
        <div className="px-3 pt-6">
          <div className="eyebrow px-3 text-[#94a3b8]">Platform Modules</div>
          <nav className="mt-2.5 space-y-1" aria-label="Main navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`link-${to.slice(1)}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${isActive ? 'bg-white/10 text-white' : 'text-[#bdc5c7] hover:bg-white/[.06] hover:text-white'}`
                }
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/10 bg-white/[.045] p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#e6e5dd]">
              <CircleHelp size={14} /> Evidence first
            </div>
            <p className="mb-0 mt-2 text-[11px] leading-[1.6] text-[#aab4b4]">
              Recorded values and model estimates are kept visually distinct.
            </p>
            <div className="mt-3 h-px bg-white/10" />
            <div className="mt-3 flex items-center justify-between text-[10px] text-[#b3bcbc]">
              <span>Data connection</span>
              <span
                className={`size-1.5 rounded-full ${workspace.mode === 'demo' ? 'bg-[#d89a61]' : workspace.health.error ? 'bg-[#d5786d]' : workspace.health.value ? 'bg-[#86bf9d]' : 'bg-[#a7b0ac]'}`}
              />
            </div>
            <div className="mt-1.5 font-mono text-[10px] tracking-wide text-[#e2c49d]">
              {statusText}
            </div>
          </div>
          <div className="px-2 pb-1 pt-5 font-mono text-[9px] tracking-[.09em] text-[#8f9b9f]">
            ANALYST WORKSPACE · V1.0
          </div>
        </div>
      </aside>
      <div className="main-panel flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e5dfd3] bg-[#f8f6f0]/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="focus-ring rounded-lg p-2 text-[#52616a] hover:bg-[#eae6dc] md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="eyebrow hidden sm:block">Research desk / {currentTitle}</div>
              <h1 className="mt-0.5 font-[var(--font-display)] text-[17px] font-bold tracking-[-.04em]">
                {currentTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <label className="hidden items-center gap-2 rounded-lg border border-[#e0dace] bg-[#fffefa] px-3 py-2 text-[12px] sm:flex">
              <span className="eyebrow !text-[9px]">Market</span>
              <select
                aria-label="Select market"
                data-testid="select-market"
                value={workspace.market ? String(workspace.market.id) : ''}
                onChange={(event) => workspace.setMarketId(event.target.value)}
                className="max-w-[150px] cursor-pointer border-0 bg-transparent text-[12px] font-semibold text-[#263640] outline-none"
              >
                {workspace.markets.value?.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.symbol} · {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="text-[#778187]" />
            </label>
            <div
              title={
                workspace.health.error ??
                (workspace.mode === 'demo'
                  ? 'Static illustrative fixtures are active.'
                  : 'Status returned by configured service.')
              }
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[9px] font-medium tracking-[.1em] ${workspace.mode === 'demo' ? 'bg-[#f2e5d7] text-[#8a542d]' : 'bg-[#dcebe4] text-[#326450]'}`}
              data-testid="status-data-mode"
            >
              <span
                className={`size-1.5 rounded-full ${workspace.mode === 'demo' ? 'bg-[#c37b45]' : workspace.health.error ? 'bg-[#b5584f]' : 'bg-[#4c9c79]'}`}
              />
              {statusText}
            </div>
            <button
              type="button"
              title="Reload workspace data"
              aria-label="Reload workspace data"
              onClick={workspace.refresh}
              className="focus-ring rounded-lg border border-[#e2ddd2] p-2 text-[#6c777c] transition hover:bg-white"
            >
              <RotateCw size={15} />
            </button>
            <a
              href="https://fastapi.tiangolo.com/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-[11px] text-[#68777b] hover:text-[#235d59] lg:flex"
            >
              API contract <ArrowUpRight size={12} />
            </a>
          </div>
        </header>
        <div className="border-b border-[#e8e2d7] bg-[#f2e5d7] px-4 py-2.5 text-center text-[11px] leading-relaxed text-[#6e4c32] md:px-8">
          {workspace.mode === 'demo' ? (
            <>
              <strong className="font-semibold">Demonstration mode.</strong> Fixture values are
              illustrative and are not live market data. Configure the FastAPI service to work with
              real responses.
            </>
          ) : (
            <>
              <strong className="font-semibold">API mode.</strong> Only validated service responses
              are shown; request or schema failures are surfaced, never replaced with fixtures.
              {workspace.health.error && (
                <span role="alert" className="ml-1 font-semibold">
                  Health check failed: {workspace.health.error}
                </span>
              )}
            </>
          )}
        </div>
        <main className="w-full flex-1 px-4 pb-10 pt-7 md:px-8 lg:px-10">
          <div className="mx-auto max-w-[1440px] page-enter">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-[#e5dfd3] px-4 py-4 text-center font-mono text-[9px] tracking-[.08em] text-[#8a918f] md:px-8">
          MARKET TREND ANALYSIS <span className="mx-2 text-[#c2b9aa]">/</span> OBSERVATIONS ≠
          ESTIMATES <span className="mx-2 text-[#c2b9aa]">/</span> {workspace.mode.toUpperCase()}{' '}
          MODE
        </footer>
      </div>
    </div>
  );
}
