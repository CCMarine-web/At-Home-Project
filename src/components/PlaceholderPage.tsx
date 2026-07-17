interface PlaceholderPageProps {
  title: string;
  description: string;
  pendingNote: string;
}

export default function PlaceholderPage({
  title,
  description,
  pendingNote,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
        <p className="text-sm font-medium text-slate-700">
          Not wired to real data yet
        </p>
        <p className="mt-1 text-sm text-slate-500">{pendingNote}</p>
      </div>
    </div>
  );
}
