export default function LastUpdated({ generatedAt }: { generatedAt: string | undefined }) {
  if (!generatedAt) {
    return <p className="text-xs text-slate-400">Last updated: unknown</p>;
  }
  const date = new Date(generatedAt);
  const formatted = date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return <p className="text-xs text-slate-400">Data last pulled from USCG PSIX: {formatted}</p>;
}
