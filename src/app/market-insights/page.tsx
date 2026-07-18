import Banner from "@/components/Banner";
import ChartCard from "@/components/ChartCard";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import HBar from "@/components/charts/HBar";
import MultiLine from "@/components/charts/MultiLine";
import VBar from "@/components/charts/VBar";
import { VESSEL_TYPE_COLOR, VESSEL_TYPE_LABEL } from "@/lib/colors";
import { AGE_BANDS, agingSharePct, coiByQuarter } from "@/lib/analytics";
import { averageAge, getFleetData, getVesselsByType } from "@/lib/fleetData";
import { getMarketReference } from "@/lib/marketReference";
import { getWcscFleet } from "@/lib/wcscData";
import type { Vessel, VesselType } from "@/lib/types";

const VESSEL_TYPES: VesselType[] = ["tank_barge", "hopper_barge", "towboat", "tugboat"];

function ageBandShares(vessels: Vessel[], currentYear: number): number[] {
  const bands = [0, 0, 0, 0];
  let total = 0;
  for (const v of vessels) {
    if (!v.buildYear || v.buildYear < 1900 || v.buildYear > currentYear) continue;
    const age = currentYear - v.buildYear;
    bands[age < 10 ? 0 : age < 20 ? 1 : age < 30 ? 2 : 3] += 1;
    total += 1;
  }
  return bands.map((b) => (total ? Math.round((b / total) * 1000) / 10 : 0));
}

export default function MarketInsightsPage() {
  const data = getFleetData();
  const ref = getMarketReference();
  const wcsc = getWcscFleet();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-100">Market Insights</h2>
        <p className="mt-4 text-sm text-slate-300">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const now = new Date(data.generatedAt);
  const currentYear = now.getFullYear();
  const byType = Object.fromEntries(VESSEL_TYPES.map((t) => [t, getVesselsByType(t)])) as Record<
    VesselType,
    Vessel[]
  >;

  // Drydock/COI demand: tank barges + Subchapter M towing vessels.
  const tankQuarters = coiByQuarter(byType.tank_barge, now, 8);
  const towingQuarters = coiByQuarter([...byType.towboat, ...byType.tugboat], now, 8);
  const dueNext12mo = (vs: Vessel[]) =>
    vs.filter((v) => {
      if (!v.coiExpirationDate) return false;
      const exp = new Date(v.coiExpirationDate);
      return exp >= now && exp <= new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }).length;
  const totalDrydockDemand12mo =
    dueNext12mo(byType.tank_barge) + dueNext12mo(byType.towboat) + dueNext12mo(byType.tugboat);

  // In-service fleet by segment, each from its best available source.
  const hopperInService = wcsc?.counts.hopperBarge ?? wcsc?.counts.dryCargoBarge ?? null;
  const fleetBySegment = [
    { label: "Dry-cargo barges", value: hopperInService ?? ref?.btsFleet.counts.drycargoBarges ?? 0 },
    { label: "Tank barges", value: data.inServiceCounts?.tank_barge ?? data.counts.tank_barge },
    { label: "Towing vessels", value: data.towingFleet?.coiInForce ?? data.counts.towboat + data.counts.tugboat },
  ];
  const fleetSources = [
    hopperInService != null
      ? "dry-cargo barges: USACE WTLUS (manual)"
      : `dry-cargo barges: BTS Table 1-34, ${ref?.btsFleet.dataYear ?? "n/a"} (all dry types incl. deck)`,
    "tank barges: PSIX, COI in force",
    "towing vessels: PSIX, Subchapter M COI in force (all operating areas)",
  ].join(" · ");

  // New-build deliveries per segment (last 20 years).
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 20 + i);
  const deliverySeries = (["tank_barge", "hopper_barge", "towboat", "tugboat"] as VesselType[]).map((t) => ({
    name: VESSEL_TYPE_LABEL[t],
    color: VESSEL_TYPE_COLOR[t],
    values: years.map((y) => byType[t].filter((v) => v.buildYear === y).length),
  }));

  // Age structure (% shares) per segment.
  const ageSeries = (["tank_barge", "hopper_barge", "towboat", "tugboat"] as VesselType[]).map((t) => ({
    name: VESSEL_TYPE_LABEL[t],
    color: VESSEL_TYPE_COLOR[t],
    values: ageBandShares(byType[t], currentYear),
  }));

  // Replacement pressure: share of records 30+ years old.
  const replacementPressure = (["hopper_barge", "towboat", "tugboat", "tank_barge"] as VesselType[])
    .map((t) => ({ label: VESSEL_TYPE_LABEL[t], value: agingSharePct(byType[t], currentYear) ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Market Insights</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>
      <p className="max-w-3xl text-sm text-slate-300">
        Executive view of the US inland/coastal fleet: how big each segment is, how old it is, how fast it
        is being replaced, and how much certificate-driven shipyard demand is coming. Every chart cites its
        source; PSIX-derived hopper figures cover the whole dry-cargo record category.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Certificate-driven drydock events, next 12 mo"
          value={totalDrydockDemand12mo.toLocaleString()}
          accentColor={VESSEL_TYPE_COLOR.tank_barge}
          sublabel="tank barge + towing vessel COI renewals"
        />
        <StatCard
          label="In-service tank barges"
          value={(data.inServiceCounts?.tank_barge ?? data.counts.tank_barge).toLocaleString()}
          accentColor={VESSEL_TYPE_COLOR.tank_barge}
          sublabel="PSIX, COI in force"
        />
        <StatCard
          label="In-service towing vessels"
          value={(data.towingFleet?.coiInForce ?? 0).toLocaleString() || "—"}
          accentColor={VESSEL_TYPE_COLOR.towboat}
          sublabel="PSIX, Subchapter M COI in force"
        />
        <StatCard
          label="US dry-cargo barges"
          value={
            hopperInService != null
              ? hopperInService.toLocaleString()
              : (ref?.btsFleet.counts.drycargoBarges ?? 0).toLocaleString()
          }
          accentColor={VESSEL_TYPE_COLOR.hopper_barge}
          sublabel={hopperInService != null ? "USACE WTLUS" : `BTS official, ${ref?.btsFleet.dataYear ?? "n/a"}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="In-service fleet by segment" source={fleetSources}>
          <HBar data={fleetBySegment} color={VESSEL_TYPE_COLOR.tank_barge} unit="vessels" />
        </ChartCard>

        <ChartCard
          title="Certificate-driven drydock demand by quarter"
          source="USCG PSIX COI expirations — tank barges (5-year COIs with drydock exams) and Subchapter M towing vessels."
        >
          <MultiLine
            labels={tankQuarters.map((q) => q.label)}
            series={[
              { name: "Tank barges", color: VESSEL_TYPE_COLOR.tank_barge, values: tankQuarters.map((q) => q.value) },
              { name: "Towing vessels", color: VESSEL_TYPE_COLOR.towboat, values: towingQuarters.map((q) => q.value) },
            ]}
            unit="COIs expiring"
          />
        </ChartCard>

        <ChartCard
          title="New-build deliveries by segment (last 20 years)"
          source="USCG PSIX build years. Hopper series covers the whole dry-cargo category."
        >
          <MultiLine
            labels={years.map((y) => `'${String(y).slice(2)}`)}
            series={deliverySeries}
            unit="delivered"
          />
        </ChartCard>

        <ChartCard
          title="Fleet age structure by segment (% of records)"
          source="USCG PSIX build years. Tank barges in-service only; other segments are all active records."
        >
          <MultiLine labels={[...AGE_BANDS]} series={ageSeries} unit="%" />
        </ChartCard>

        <ChartCard
          title="Replacement pressure: share of fleet 30+ years old"
          source="USCG PSIX build years. Older fleets with thin recent new-build activity are repair-demand candidates."
        >
          <VBar data={replacementPressure} color={VESSEL_TYPE_COLOR.towboat} unit="% of records" />
        </ChartCard>

        <ChartCard
          title="Reported major dry-cargo operators"
          source={ref?.majorDryCargoOperators.source ?? "Trade press"}
        >
          {ref ? (
            <HBar
              data={ref.majorDryCargoOperators.operators.map((o) => ({
                label: o.name.split(" (")[0],
                value: o.dryCargoBarges,
              }))}
              color={VESSEL_TYPE_COLOR.hopper_barge}
              unit="barges (reported, approx.)"
            />
          ) : (
            <p className="text-sm text-slate-400">Reference data unavailable.</p>
          )}
        </ChartCard>
      </div>

      <Banner status="warning" title="Reading these figures">
        <p>
          Segment totals come from different best-available sources (labeled per chart): PSIX COI filters
          for the inspected fleets, official BTS/USACE figures for uninspected dry-cargo barges, and
          trade-press reporting for operator fleets. Averages and shares computed from PSIX dry-cargo
          records include retired hulls; treat those as directional, not absolute.
        </p>
      </Banner>
    </div>
  );
}
