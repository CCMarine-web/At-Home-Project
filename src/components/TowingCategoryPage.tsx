import Banner from "@/components/Banner";
import ChartCard from "@/components/ChartCard";
import AwaitingData from "@/components/AwaitingData";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import CoiTimelineChart from "@/components/charts/CoiTimelineChart";
import Donut from "@/components/charts/Donut";
import HBar from "@/components/charts/HBar";
import VBar from "@/components/charts/VBar";
import { VESSEL_TYPE_COLOR } from "@/lib/colors";
import { breakdownToPoints, deliveriesByYear } from "@/lib/analytics";
import { averageAge, computeAgeBuckets, computeCoiTimeline, getFleetData, getVesselsByType } from "@/lib/fleetData";
import { getWcscFleet } from "@/lib/wcscData";
import type { VesselType } from "@/lib/types";

export default function TowingCategoryPage({
  type,
  title,
}: {
  type: Extract<VesselType, "towboat" | "tugboat">;
  title: string;
}) {
  const data = getFleetData();
  const wcsc = getWcscFleet();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
        <p className="mt-4 text-sm text-slate-300">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const now = new Date(data.generatedAt);
  const currentYear = now.getFullYear();
  const vessels = getVesselsByType(type);
  const inService = data.inServiceCounts?.[type] ?? null;
  const withCoi = vessels.filter((v) => v.coiExpirationDate);
  const coiTimeline = computeCoiTimeline(vessels, now);

  const subtypeBreakdown: Record<string, number> = {};
  for (const v of vessels) {
    const s = v.serviceSubType || "(none)";
    subtypeBreakdown[s] = (subtypeBreakdown[s] || 0) + 1;
  }

  const hpClasses = wcsc?.towboatHpClasses ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      <Banner status="warning" title="This split is a proxy, not a Coast Guard classification">
        <p>{data.methodology.towboatsTugboats}</p>
        {data.methodology.towingInService && <p className="mt-1">{data.methodology.towingInService}</p>}
      </Banner>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={`In-service ${title.toLowerCase()}`}
          value={inService !== null ? inService.toLocaleString() : "—"}
          accentColor={VESSEL_TYPE_COLOR[type]}
          sublabel="COI in force (Subchapter M)"
        />
        <StatCard
          label="PSIX classified records"
          value={vessels.length.toLocaleString()}
          sublabel="incl. vessels without a current COI"
        />
        <StatCard label="Average age" value={averageAge(vessels, currentYear)?.toString() ?? "—"} sublabel="years" />
        <StatCard
          label="Horsepower breakdown"
          value={hpClasses ? "See chart" : "Awaiting WTLUS"}
          sublabel="no free per-vessel HP source — see Data Sources"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Age distribution" source="USCG PSIX build years.">
          <AgeHistogram data={computeAgeBuckets(vessels, currentYear)} color={VESSEL_TYPE_COLOR[type]} />
        </ChartCard>

        <ChartCard
          title="COI expirations by month (next 24 months)"
          source={`USCG PSIX — Subchapter M COIs on file (${withCoi.length.toLocaleString()} of ${vessels.length.toLocaleString()} records have one). COI renewals drive scheduled survey/drydock work.`}
        >
          <CoiTimelineChart data={coiTimeline} color={VESSEL_TYPE_COLOR[type]} />
        </ChartCard>

        <ChartCard
          title="Operating-area sub-types"
          source="USCG PSIX service sub-type — the operating-area basis for the towboat/tugboat split."
        >
          <Donut data={breakdownToPoints(subtypeBreakdown, 6, { "(none)": "Not specified" })} unit="vessels" />
        </ChartCard>

        <ChartCard
          title="New-build deliveries per year (last 25 years)"
          source="USCG PSIX build years."
        >
          <VBar
            data={deliveriesByYear(vessels, currentYear - 25, currentYear)}
            color={VESSEL_TYPE_COLOR[type]}
            unit="vessels delivered"
          />
        </ChartCard>

        {wcsc?.topOperators?.towboatTugboat && (
          <ChartCard
            title={`Top towing vessel operators (WTLUS${wcsc?.dataYear ? ` ${wcsc.dataYear}` : ""})`}
            source="USACE WCSC operator of record for the whole US towing fleet (towboats + tugboats combined — WCSC does not split them)."
          >
            <HBar
              data={wcsc.topOperators.towboatTugboat.map((o) => ({ label: o.name, value: o.count }))}
              color={VESSEL_TYPE_COLOR[type]}
              unit="vessels"
            />
          </ChartCard>
        )}

        {hpClasses && hpClasses.length > 0 ? (
          <ChartCard
            title={`US towing fleet by horsepower class (WTLUS${wcsc?.dataYear ? ` ${wcsc.dataYear}` : ""})`}
            source={`USACE WCSC per-vessel horsepower, whole US towing fleet${
              wcsc?.towboatHpUnknown ? ` (${wcsc.towboatHpUnknown.toLocaleString()} vessels with HP not reported excluded)` : ""
            }.`}
          >
            <HBar
              data={hpClasses.map((r) => ({ label: r.label, value: r.count }))}
              color={VESSEL_TYPE_COLOR[type]}
              unit="vessels"
            />
          </ChartCard>
        ) : (
          <AwaitingData title="Fleet by horsepower class">
            <p>
              PSIX carries no horsepower data and no free per-vessel source exists. USACE WTLUS tabulates
              towboats by horsepower class annually — retrieve it manually (see Data Sources) and enter the
              buckets in <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">data/wcsc-fleet.json</code>{" "}
              to light this chart up.
            </p>
          </AwaitingData>
        )}
      </div>
    </div>
  );
}
