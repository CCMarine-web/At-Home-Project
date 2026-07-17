import Banner from "@/components/Banner";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import { VESSEL_TYPE_COLOR } from "@/lib/colors";
import { averageAge, computeAgeBuckets, getFleetData, getVesselsByType } from "@/lib/fleetData";

const CURRENT_YEAR = 2026;

export default function HopperBargesPage() {
  const data = getFleetData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-900">Hopper Barges</h2>
        <p className="mt-4 text-sm text-slate-600">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const vessels = getVesselsByType("hopper_barge");
  const benchmark = data.benchmarkFlags.find((f) => f.type === "hopper_barge");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Hopper Barges</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      <Banner status="critical" title="This is not a verified hopper-barge-only count">
        <p>{data.methodology.hopperBarges}</p>
        {benchmark && (
          <p className="mt-1">
            For comparison, the Waterways Journal's industry estimate for hopper barges specifically is
            ~{benchmark.benchmark.toLocaleString()} — well below this figure, which reflects PSIX's entire
            dry-cargo-barge category.
          </p>
        )}
      </Banner>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="PSIX Freight Barge category (used as Hopper Barges)"
          value={vessels.length.toLocaleString()}
          accentColor={VESSEL_TYPE_COLOR.hopper_barge}
        />
        <StatCard label="Average age" value={averageAge(vessels, CURRENT_YEAR)?.toString() ?? "—"} sublabel="years" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Age distribution</h3>
        <AgeHistogram data={computeAgeBuckets(vessels, CURRENT_YEAR)} color={VESSEL_TYPE_COLOR.hopper_barge} />
      </div>
    </div>
  );
}
