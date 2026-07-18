import Banner from "@/components/Banner";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import { VESSEL_TYPE_COLOR, VESSEL_TYPE_LABEL } from "@/lib/colors";
import { computeAgeBuckets, computeCoiBuckets, getFleetData } from "@/lib/fleetData";
import { getWcscFleet } from "@/lib/wcscData";
import type { VesselType } from "@/lib/types";

const CURRENT_YEAR = 2026;
const NOW = new Date("2026-07-16");
const VESSEL_TYPES: VesselType[] = ["tank_barge", "hopper_barge", "towboat", "tugboat"];

export default function DashboardPage() {
  const data = getFleetData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-4 text-sm text-slate-600">
          No fleet data has been pulled yet. Run the refresh job to populate this dashboard.
        </p>
      </div>
    );
  }

  const tankBarges = data.vessels.filter((v) => v.type === "tank_barge");
  const coi = computeCoiBuckets(tankBarges, NOW);
  const wcsc = getWcscFleet();
  const wcscHopper = wcsc?.counts.dryCargoBarge ?? null;
  // Once the authoritative WTLUS in-service hopper figure is entered, the hopper
  // card shows it instead of the inflated PSIX active-record count, so drop
  // hopper from the benchmark-mismatch warning.
  const farOffFlags = data.benchmarkFlags.filter(
    (f) => f.farOff && !(f.type === "hopper_barge" && wcscHopper != null)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      {farOffFlags.length > 0 && (
        <Banner status="warning" title="Fleet totals differ significantly from published industry benchmarks">
          <ul className="list-inside list-disc space-y-1">
            {farOffFlags.map((f) => (
              <li key={f.type}>
                {VESSEL_TYPE_LABEL[f.type] ?? f.type}: PSIX shows {f.actual.toLocaleString()} vs. the
                Waterways Journal benchmark of ~{f.benchmark.toLocaleString()}. See the Data Sources tab
                for why.
              </li>
            ))}
          </ul>
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {VESSEL_TYPES.map((type) => {
          const wcscOverride = type === "hopper_barge" ? wcscHopper : null;
          return (
            <StatCard
              key={type}
              label={VESSEL_TYPE_LABEL[type]}
              value={(wcscOverride ?? data.counts[type]).toLocaleString()}
              accentColor={VESSEL_TYPE_COLOR[type]}
              sublabel={wcscOverride != null ? "in-service (USACE WCSC)" : undefined}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Tank barge age distribution</h3>
          <AgeHistogram data={computeAgeBuckets(tankBarges, CURRENT_YEAR)} color={VESSEL_TYPE_COLOR.tank_barge} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Tank barge COI expirations coming due</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">This quarter</dt>
              <dd className="text-lg font-semibold text-slate-900">{coi.thisQuarter}</dd>
            </div>
            <div>
              <dt className="text-slate-500">This year</dt>
              <dd className="text-lg font-semibold text-slate-900">{coi.thisYear}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Next year</dt>
              <dd className="text-lg font-semibold text-slate-900">{coi.nextYear}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Already expired</dt>
              <dd className="text-lg font-semibold text-red-600">{coi.expired}</dd>
            </div>
            <div>
              <dt className="text-slate-500">No COI on record</dt>
              <dd className="text-lg font-semibold text-slate-900">{coi.noRecord}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">See the Drydocking tab for the full breakdown and vessel list.</p>
        </div>
      </div>
    </div>
  );
}
