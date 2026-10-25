import type { ReactNode } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useWorkspace } from '@/features/market/WorkspaceContext';

export function PageHeading({
  overline,
  title,
  description,
  actions,
}: {
  overline: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#e5dfd3] pb-5 sm:flex-row sm:items-end">
      <div>
        <div className="eyebrow">{overline}</div>
        <h2 className="mt-2 font-[var(--font-display)] text-[27px] font-bold tracking-[-.055em] text-[#263640] sm:text-[32px]">
          {title}
        </h2>
        <p className="mb-0 mt-1.5 max-w-2xl text-[13px] leading-[1.65] text-[#68767b]">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface min-w-0 ${className}`}>
      {(title || eyebrow || aside) && (
        <div className="flex items-start justify-between gap-4 border-b border-[#eee9df] px-5 py-4">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && (
              <h3 className="mb-0 mt-1 font-[var(--font-display)] text-[14px] font-bold tracking-[-.02em]">
                {title}
              </h3>
            )}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function LoadingState({ label = 'Loading service data' }: { label?: string }) {
  return (
    <div className="surface p-6" aria-label={label} data-testid="loading-state">
      <div className="mb-4 h-3 w-32 animate-pulse rounded bg-[#ebe7de]" />
      <div className="h-36 animate-pulse rounded-lg bg-[#f1eee7]" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="h-14 animate-pulse rounded-lg bg-[#f1eee7]" />
        <div className="h-14 animate-pulse rounded-lg bg-[#f1eee7]" />
        <div className="h-14 animate-pulse rounded-lg bg-[#f1eee7]" />
      </div>
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-xl border border-[#e4b9aa] bg-[#fbefeb] p-5"
      role="alert"
      data-testid="error-state"
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#843d34]">
        <AlertTriangle size={16} /> Service response unavailable
      </div>
      <p className="m-0 text-[12px] leading-relaxed text-[#714d47]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[#d8aaa0] bg-[#fffaf8] px-3 py-2 text-[11px] font-semibold text-[#773d34] hover:bg-white"
      >
        <RotateCw size={13} /> Try again
      </button>
    </div>
  );
}
export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      className="grid min-h-[180px] place-items-center p-7 text-center"
      data-testid="empty-state"
    >
      <div>
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-[#f1eee7]">
          <CalendarDays size={17} className="text-[#78837f]" />
        </div>
        <h3 className="mb-1 font-[var(--font-display)] text-[13px] font-bold">{title}</h3>
        <p className="m-0 max-w-md text-[12px] leading-relaxed text-[#778188]">{detail}</p>
      </div>
    </div>
  );
}
export function StatBlock({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-[#e9e4da] bg-[#fffefa] px-4 py-3.5">
      <div className="eyebrow">{label}</div>
      <div
        className="mono mt-2 text-[21px] font-medium tracking-[-.04em] text-[#263640]"
        data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] text-[#828b8c]">{note}</div>
    </div>
  );
}
export function RangeControls() {
  const { market, markets, setMarketId, dateRange, setDateRange, observations } = useWorkspace();
  const latest = observations.value?.at(-1)?.date;
  const setPreset = (days: number | null) => {
    if (!days || !latest) {
      setDateRange({ startDate: '', endDate: '' });
      return;
    }
    const end = new Date(`${latest}T12:00:00Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);
    setDateRange({ startDate: start.toISOString().slice(0, 10), endDate: latest });
  };
  const presets: Array<[string, number | null]> = [
    ['1M', 30],
    ['3M', 90],
    ['6M', 180],
    ['All', null],
  ];
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#e4ded2] bg-[#f4f1e9] p-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[#fffefa] px-3 py-2 text-[11px] sm:min-w-[215px]">
        <span className="eyebrow !text-[9px]">Market</span>
        <select
          data-testid="select-market-inline"
          aria-label="Select market"
          value={market ? String(market.id) : ''}
          onChange={(event) => setMarketId(event.target.value)}
          className="min-w-0 flex-1 cursor-pointer bg-transparent text-[12px] font-semibold outline-none"
        >
          {markets.value?.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.symbol} · {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1.5 px-1 text-[10px] text-[#69767a]">
          <CalendarDays size={13} /> Period
        </span>
        {presets.map(([label, days]) => (
          <button
            key={label}
            type="button"
            onClick={() => setPreset(days)}
            className={`focus-ring rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition ${!dateRange.startDate && label === 'All' ? 'bg-[#2c6862] text-white' : 'text-[#69767a] hover:bg-white'}`}
            data-testid={`range-${String(label).toLowerCase()}`}
          >
            {label}
          </button>
        ))}
        <label className="sr-only" htmlFor="range-start">
          Start date
        </label>
        <input
          id="range-start"
          aria-label="Start date"
          data-testid="input-start-date"
          type="date"
          value={dateRange.startDate}
          onChange={(event) => setDateRange({ ...dateRange, startDate: event.target.value })}
          className="focus-ring w-[126px] rounded-md border border-[#e4ded2] bg-white px-2 py-1.5 font-mono text-[10px] text-[#526067]"
        />
        <span className="text-[#a1a19a]">—</span>
        <label className="sr-only" htmlFor="range-end">
          End date
        </label>
        <input
          id="range-end"
          aria-label="End date"
          data-testid="input-end-date"
          type="date"
          value={dateRange.endDate}
          onChange={(event) => setDateRange({ ...dateRange, endDate: event.target.value })}
          className="focus-ring w-[126px] rounded-md border border-[#e4ded2] bg-white px-2 py-1.5 font-mono text-[10px] text-[#526067]"
        />
      </div>
    </div>
  );
}
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] text-[#748084]">
      <span>
        PAGE {String(page).padStart(2, '0')} / {String(Math.max(1, totalPages)).padStart(2, '0')}
      </span>
      <button
        type="button"
        aria-label="Previous page"
        data-testid="button-page-previous"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="focus-ring rounded-md border border-[#e5dfd3] p-1.5 disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[#f5f2eb]"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        type="button"
        aria-label="Next page"
        data-testid="button-page-next"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="focus-ring rounded-md border border-[#e5dfd3] p-1.5 disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[#f5f2eb]"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
