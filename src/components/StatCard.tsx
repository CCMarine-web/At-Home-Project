interface StatCardProps {
  label: string;
  value: string;
  accentColor?: string;
  sublabel?: string;
}

export default function StatCard({ label, value, accentColor, sublabel }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {accentColor && (
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
    </div>
  );
}
