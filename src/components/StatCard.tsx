interface StatCardProps {
  label: string;
  value: string;
  accentColor?: string;
  sublabel?: string;
}

export default function StatCard({ label, value, accentColor, sublabel }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        {accentColor && (
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-100">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}
