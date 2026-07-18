interface AwaitingDataProps {
  title: string;
  /** What data is missing and the honest reason why. */
  children: React.ReactNode;
}

/**
 * Shown in place of a chart whose data source is gated (e.g. WTLUS figures that
 * must be retrieved manually). The app never invents numbers to fill a chart.
 */
export default function AwaitingData({ title, children }: AwaitingDataProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300" aria-hidden>
          !
        </span>
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      </div>
      <div className="mt-2 text-sm text-slate-400">{children}</div>
    </div>
  );
}
