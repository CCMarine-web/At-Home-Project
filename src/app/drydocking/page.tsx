import PlaceholderPage from "@/components/PlaceholderPage";

export default function DrydockingPage() {
  return (
    <PlaceholderPage
      title="Drydocking"
      description="Tank barge Certificate of Inspection (COI) expirations: counts due this quarter/year/next year, an expiration timeline, and a sortable/filterable vessel table."
      pendingNote="Will populate from USCG PSIX getVesselDocuments (COI issue/expiration dates) once wired in."
    />
  );
}
