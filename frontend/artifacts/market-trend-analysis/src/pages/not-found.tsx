import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-[55dvh] place-items-center">
      <div className="surface max-w-lg p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e5eee8] text-[#39776c]">
          <Compass size={21} />
        </div>
        <div className="eyebrow mt-5">Route not in workspace</div>
        <h2 className="mt-2 font-[var(--font-display)] text-[26px] font-bold tracking-[-.05em]">
          This page is outside the data set.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-[#768183]">
          Choose a research view from the navigation to return to the analysis workspace.
        </p>
        <Link
          to="/dashboard"
          className="focus-ring mt-5 inline-flex rounded-lg bg-[#2e6963] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#255a55]"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
