interface ChartCardProps {
  title: string;
  /** One-line data-source / methodology caption shown under the chart. */
  source?: string;
  children: React.ReactNode;
}

/** Standard card wrapper so every chart carries a title and a source caption. */
export default function ChartCard({ title, source, children }: ChartCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mt-2">{children}</div>
      {source && <p className="mt-2 text-xs text-slate-500">{source}</p>}
    </div>
  );
}
