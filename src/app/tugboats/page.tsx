import PlaceholderPage from "@/components/PlaceholderPage";

export default function TugboatsPage() {
  return (
    <PlaceholderPage
      title="Tugboats"
      description="Count and age distribution for tugboats. Horsepower breakdown will be shown only if a reliable source is confirmed; otherwise marked unavailable rather than estimated."
      pendingNote="Count/age will populate from USCG PSIX. Horsepower has no confirmed government source yet (see Data Sources tab)."
    />
  );
}
