import PlaceholderPage from "@/components/PlaceholderPage";

export default function DataSourcesPage() {
  return (
    <PlaceholderPage
      title="Data Sources"
      description="Plain-English list of every source used, what data came from each, how often it refreshes, known limitations, and the last successful data pull."
      pendingNote="Will list USCG PSIX (confirmed, weekly snapshot) as the primary source, plus USACE WCSC and MARAD as currently unavailable/pending, once the data layer is wired in."
    />
  );
}
