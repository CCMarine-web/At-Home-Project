import Banner from "@/components/Banner";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import { VESSEL_TYPE_COLOR } from "@/lib/colors";
import { averageAge, computeAgeBuckets, getFleetData, getVesselsByType } from "@/lib/fleetData";
import type { VesselType } from "@/lib/types";

const CURRENT_YEAR = 2026;

export default function TowingCategoryPage({
  type,
  title,
}: {
  type: Extract<VesselType, "towboat" | "tugboat">;
  title: string;
}) {
  const data = getFleetData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-4 text-sm text-slate-600">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const vessels = getVesselsByType(type);
  const avgAge = averageAge(vessels, CURRENT_YEAR);
  const ageBuckets = computeAgeBuckets(vessels, CURRENT_YEAR);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      <Banner status="warning" title="This split is a proxy, not a Coast Guard classification">
        <p>{data.methodology.towboatsTugboats}</p>
      </Banner>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label={`${title} count`} value={vessels.length.toLocaleString()} accentColor={VESSEL_TYPE_COLOR[type]} />
        <StatCard label="Average age" value={avgAge !== null ? `${avgAge} yrs` : "—"} />
        <StatCard label="Horsepower breakdown" value="Unavailable" sublabel="No confirmed government source — see Data Sources tab" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Age distribution</h3>
        <AgeHistogram data={ageBuckets} color={VESSEL_TYPE_COLOR[type]} />
      </div>
    </div>
  );
}
