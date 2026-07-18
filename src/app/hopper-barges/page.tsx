import Banner from "@/components/Banner";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import { VESSEL_TYPE_COLOR } from "@/lib/colors";
import { averageAge, computeAgeBuckets, getFleetData, getVesselsByType } from "@/lib/fleetData";
import { getWcscFleet } from "@/lib/wcscData";

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
  const wcsc = getWcscFleet();
  const wcscCount = wcsc?.counts.dryCargoBarge ?? null;
  const yearSuffix = wcsc?.dataYear ? ` ${wcsc.dataYear}` : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Hopper Barges</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      {wcscCount != null ? (
        <Banner status="good" title="Headline figure is the USACE in-service dry-cargo barge count">
          <p>
            The headline is the authoritative in-service dry-cargo (open + covered hopper) barge total from
            USACE&apos;s Waterborne Commerce Statistics Center (WTLUS{yearSuffix}), retrieved manually. The
            PSIX-derived number below counts PSIX&apos;s entire active-record Freight Barge category —
            including long-retired hulls MISLE never deactivates — and is kept only as a cross-check.
          </p>
        </Banner>
      ) : (
        <Banner status="critical" title="Awaiting the authoritative WTLUS figure">
          <p>{data.methodology.hopperBarges}</p>
          <p className="mt-1">
            The real in-service count comes from USACE WTLUS (~18,000) and must be entered manually into{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">data/wcsc-fleet.json</code> — see the
            Data Sources tab. Until then, the number below is PSIX&apos;s entire dry-cargo-barge category and
            overstates the in-service hopper fleet roughly threefold.
          </p>
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {wcscCount != null && (
          <StatCard
            label={`In-service dry-cargo barges (USACE WCSC${yearSuffix})`}
            value={wcscCount.toLocaleString()}
            accentColor={VESSEL_TYPE_COLOR.hopper_barge}
          />
        )}
        <StatCard
          label="PSIX active-record cross-check (includes retired hulls)"
          value={vessels.length.toLocaleString()}
          accentColor={wcscCount != null ? undefined : VESSEL_TYPE_COLOR.hopper_barge}
        />
        <StatCard
          label="Average age"
          value={averageAge(vessels, CURRENT_YEAR)?.toString() ?? "—"}
          sublabel="years (PSIX records)"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Age distribution (PSIX records)</h3>
        <AgeHistogram data={computeAgeBuckets(vessels, CURRENT_YEAR)} color={VESSEL_TYPE_COLOR.hopper_barge} />
      </div>
    </div>
  );
}
