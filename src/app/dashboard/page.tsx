import PlaceholderPage from "@/components/PlaceholderPage";

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Executive summary: total fleet counts by vessel type, fleet age distribution, COI expirations coming due, and at-a-glance red flags."
      pendingNote="Will populate once the USCG PSIX data pipeline is wired in (next step)."
    />
  );
}
