import Banner from "@/components/Banner";
import ChartCard from "@/components/ChartCard";
import AwaitingData from "@/components/AwaitingData";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import Donut from "@/components/charts/Donut";
import HBar from "@/components/charts/HBar";
import VBar from "@/components/charts/VBar";
import { VESSEL_TYPE_COLOR } from "@/lib/colors";
import { ageComposition, deliveriesByYear } from "@/lib/analytics";
import { getFleetData, getVesselsByType } from "@/lib/fleetData";
import { getMarketReference } from "@/lib/marketReference";
import { getWcscFleet } from "@/lib/wcscData";

// Deck barges live inside PSIX's "Freight Barge" category and PSIX cannot split
// them out (its sub-type field is ~98% "General"), so this tab pairs sourced
// national reference figures with the PSIX dry-cargo category as the superset.
export default function DeckBargesPage() {
  const data = getFleetData();
  const wcsc = getWcscFleet();
  const ref = getMarketReference();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-100">Deck Barges</h2>
        <p className="mt-4 text-sm text-slate-300">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const now = new Date(data.generatedAt);
  const currentYear = now.getFullYear();
  const dryCargo = getVesselsByType("hopper_barge"); // PSIX freight category = all dry-cargo types incl. deck
  const deckCount = wcsc?.counts.deckBarge ?? null;
  const sizeRanges = wcsc?.deckBargeSizeRanges ?? null;
  const yearSuffix = wcsc?.dataYear ? ` ${wcsc.dataYear}` : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Deck Barges</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      <Banner
        status={deckCount != null ? "good" : "warning"}
        title={
          deckCount != null
            ? "Deck barge figures are from USACE WTLUS"
            : "Deck barges cannot be isolated in the automated (PSIX) data"
        }
      >
        <p>
          USCG PSIX groups deck barges into one &quot;Freight Barge&quot; category with hopper and other
          dry-cargo barges, and its sub-type field is ~98% generic — so deck-barge-specific counts and size
          ranges come from USACE&apos;s annual WTLUS survey (retrieved manually; the portal blocks automated
          tools). PSIX-derived charts below cover the whole dry-cargo category, of which deck barges are a
          part.
        </p>
      </Banner>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {deckCount != null ? (
          <StatCard
            label={`Deck barges in service (WTLUS${yearSuffix})`}
            value={deckCount.toLocaleString()}
            accentColor={VESSEL_TYPE_COLOR.hopper_barge}
          />
        ) : (
          <StatCard label="Deck barges in service" value="Awaiting WTLUS" sublabel="see Data Sources tab for how to enter it" />
        )}
        <StatCard
          label={`All US dry-cargo barges (BTS ${ref?.btsFleet.dataYear ?? ""})`}
          value={ref ? ref.btsFleet.counts.drycargoBarges.toLocaleString() : "—"}
          sublabel="hopper + deck + covered + other, official DOT figure"
        />
        <StatCard
          label="PSIX active dry-cargo records"
          value={dryCargo.length.toLocaleString()}
          sublabel="all types incl. retired hulls"
        />
        <StatCard
          label="Industry total barge fleet"
          value={ref ? `${ref.majorDryCargoOperators.totalBargeFleet.replace("more than ", ">")}` : "—"}
          sublabel="USACE-sourced trade-press figure, all barge types"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sizeRanges && sizeRanges.length > 0 ? (
          <ChartCard title={`Deck barges by size range (WTLUS${yearSuffix})`} source={wcsc?.source}>
            <HBar
              data={sizeRanges.map((r) => ({ label: r.label, value: r.count }))}
              color={VESSEL_TYPE_COLOR.hopper_barge}
              unit="deck barges"
            />
          </ChartCard>
        ) : (
          <AwaitingData title="Deck barges by size range">
            <p>
              WTLUS tabulates barges by dimensions, but the figures must be entered manually into{" "}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">data/wcsc-fleet.json</code> (the
              file documents each step). Once entered, this chart renders automatically.
            </p>
          </AwaitingData>
        )}

        {deckCount == null && (
          <AwaitingData title="Deck barge count (WTLUS)">
            <p>
              The in-service deck barge total comes from WTLUS Volume 1 (National Summaries). Retrieve it in
              a normal browser from the WCSC portal and enter it in{" "}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">data/wcsc-fleet.json</code> — the
              headline card and this tab light up automatically.
            </p>
          </AwaitingData>
        )}

        <ChartCard
          title="Dry-cargo category: new-build deliveries per year (last 25 years)"
          source="USCG PSIX build years for the whole dry-cargo (freight barge) category — deck barges included but not separable."
        >
          <VBar
            data={deliveriesByYear(dryCargo, currentYear - 25, currentYear)}
            color={VESSEL_TYPE_COLOR.hopper_barge}
            unit="barges delivered"
          />
        </ChartCard>

        <ChartCard
          title="Dry-cargo category: age composition"
          source="USCG PSIX build years, all active dry-cargo barge records (incl. retired hulls)."
        >
          <Donut data={ageComposition(dryCargo, currentYear)} unit="records" />
        </ChartCard>
      </div>
    </div>
  );
}
