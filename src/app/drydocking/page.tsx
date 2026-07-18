import Banner from "@/components/Banner";
import ChartCard from "@/components/ChartCard";
import AwaitingData from "@/components/AwaitingData";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import CoiTimelineChart from "@/components/charts/CoiTimelineChart";
import HBar from "@/components/charts/HBar";
import VBar from "@/components/charts/VBar";
import Donut from "@/components/charts/Donut";
import VesselTable from "@/components/VesselTable";
import { STATUS_COLOR, VESSEL_TYPE_COLOR } from "@/lib/colors";
import {
  breakdownToPoints,
  coiByQuarter,
  fleetNamePrefixes,
  sizeClasses,
} from "@/lib/analytics";
import { computeAgeBuckets, computeCoiBuckets, computeCoiTimeline, getFleetData } from "@/lib/fleetData";

export default function DrydockingPage() {
  const data = getFleetData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-100">Drydocking</h2>
        <p className="mt-4 text-sm text-slate-300">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const now = new Date(data.generatedAt);
  const currentYear = now.getFullYear();
  const tankBarges = data.vessels.filter((v) => v.type === "tank_barge");
  const coi = computeCoiBuckets(tankBarges, now);
  const timeline = computeCoiTimeline(tankBarges, now);
  const quarters = coiByQuarter(tankBarges, now, 8);

  const twelveMonthsOut = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const dueNext12mo = tankBarges.filter((v) => {
    if (!v.coiExpirationDate) return false;
    const exp = new Date(v.coiExpirationDate);
    return exp >= now && exp <= twelveMonthsOut;
  });
  const operatorPrefixes = fleetNamePrefixes(dueNext12mo, 15);

  const sizes = sizeClasses(tankBarges);
  const subtypes = data.tankSubtypeBreakdown
    ? breakdownToPoints(data.tankSubtypeBreakdown, 6, { "(none)": "Not specified" })
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Drydocking — Tank Barge Demand Forecast</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>
      <p className="max-w-3xl text-sm text-slate-300">
        In-service tank barges (unexpired Certificate of Inspection) and when their COIs come due. COI
        renewal drives scheduled shipyard work, so the expiration timeline below is the demand forecast.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="In-service tank barges"
          value={tankBarges.length.toLocaleString()}
          accentColor={VESSEL_TYPE_COLOR.tank_barge}
          sublabel="unexpired COI"
        />
        <StatCard label="COIs due this quarter" value={coi.thisQuarter.toLocaleString()} accentColor={STATUS_COLOR.critical} />
        <StatCard label="Due rest of this year" value={coi.thisYear.toLocaleString()} accentColor={STATUS_COLOR.warning} />
        <StatCard label="Due within 12 months" value={dueNext12mo.length.toLocaleString()} accentColor={STATUS_COLOR.warning} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="COI expirations by month (next 24 months)"
          source="USCG PSIX — latest COI on file per in-service tank barge."
        >
          <CoiTimelineChart data={timeline} />
        </ChartCard>

        <ChartCard
          title="Drydock demand by quarter (next 8 quarters)"
          source="USCG PSIX — COI expirations bucketed by calendar quarter."
        >
          <VBar data={quarters} color={VESSEL_TYPE_COLOR.tank_barge} unit="COIs expiring" />
        </ChartCard>

        <ChartCard
          title="Operator fleets with COIs due in the next 12 months"
          source="Fleet name prefix (e.g. KIRBY, FMT) — a naming-convention proxy for the operator. PSIX carries no owner/operator field, so treat as indicative, not a registry of record."
        >
          <HBar data={operatorPrefixes} color={VESSEL_TYPE_COLOR.tank_barge} unit="barges due" />
        </ChartCard>

        <ChartCard title="In-service tank barge age distribution" source="USCG PSIX build years.">
          <AgeHistogram data={computeAgeBuckets(tankBarges, currentYear)} color={VESSEL_TYPE_COLOR.tank_barge} />
        </ChartCard>

        {sizes.length > 0 ? (
          <ChartCard
            title="In-service fleet by hull length"
            source="USCG PSIX hull dimensions (overall length)."
          >
            <HBar data={sizes} color={VESSEL_TYPE_COLOR.tank_barge} unit="barges" />
          </ChartCard>
        ) : (
          <AwaitingData title="Fleet by hull length">
            <p>
              Hull dimensions are being fetched from PSIX for the in-service fleet — this chart populates
              on the next data refresh.
            </p>
          </AwaitingData>
        )}

        {subtypes.length > 0 ? (
          <ChartCard
            title="In-service fleet by cargo service"
            source="USCG PSIX tank barge service sub-type (e.g. liquid chemical vs. petroleum)."
          >
            <Donut data={subtypes} unit="barges" />
          </ChartCard>
        ) : (
          <AwaitingData title="Fleet by cargo service">
            <p>
              Cargo sub-types are being fetched from PSIX for the in-service fleet — this chart populates
              on the next data refresh.
            </p>
          </AwaitingData>
        )}
      </div>

      <Banner status="warning" title="How to read this forecast">
        <p>
          A tank barge&apos;s COI is issued for five years, with drydock examinations required to keep or
          renew it, so COI expirations are a strong schedule signal for shipyard demand — but operators can
          drydock early, re-phase, or retire a barge instead of renewing. Barges with an expired or missing
          COI are excluded from every figure on this tab.
        </p>
      </Banner>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">All in-service tank barges</h3>
        <VesselTable vessels={tankBarges} now={now.toISOString()} />
      </div>
    </div>
  );
}
