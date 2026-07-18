import Banner from "@/components/Banner";
import ChartCard from "@/components/ChartCard";
import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import AgeHistogram from "@/components/charts/AgeHistogram";
import Donut from "@/components/charts/Donut";
import HBar from "@/components/charts/HBar";
import VBar from "@/components/charts/VBar";
import { VESSEL_TYPE_COLOR } from "@/lib/colors";
import { ageComposition, agingSharePct, deliveriesByYear, fleetNamePrefixes } from "@/lib/analytics";
import { averageAge, computeAgeBuckets, getFleetData, getVesselsByType } from "@/lib/fleetData";
import { getMarketReference } from "@/lib/marketReference";
import { getWcscFleet } from "@/lib/wcscData";

export default function HopperBargesPage() {
  const data = getFleetData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-100">Hopper Barges</h2>
        <p className="mt-4 text-sm text-slate-300">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const now = new Date(data.generatedAt);
  const currentYear = now.getFullYear();
  const vessels = getVesselsByType("hopper_barge");
  const wcsc = getWcscFleet();
  const ref = getMarketReference();
  // Hopper-specific WTLUS count only — dryCargoBarge includes deck barges.
  const wcscCount = wcsc?.counts.hopperBarge ?? null;
  const yearSuffix = wcsc?.dataYear ? ` ${wcsc.dataYear}` : "";

  const prefixes = fleetNamePrefixes(vessels, 15);
  const deliveries = deliveriesByYear(vessels, currentYear - 25, currentYear);
  const ages = ageComposition(vessels, currentYear);
  const aging = agingSharePct(vessels, currentYear);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Hopper Barges</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>

      {wcscCount != null ? (
        <Banner status="good" title="Headline figure is the USACE in-service dry-cargo barge count">
          <p>
            The headline is the authoritative in-service count from USACE&apos;s Waterborne Commerce
            Statistics Center (WTLUS{yearSuffix}), retrieved manually. The PSIX record count below includes
            long-retired hulls MISLE never deactivates and is kept only as a cross-check.
          </p>
        </Banner>
      ) : (
        <Banner status="critical" title="No verified in-service hopper count is available yet">
          <p>{data.methodology.hopperBarges}</p>
          <p className="mt-1">
            Hopper barges are uninspected (no COI), so PSIX offers no in-service signal. The industry
            benchmark is ~{(ref?.industryBenchmarks.hopperBargesInService ?? 18000).toLocaleString()}{" "}
            in-service hoppers; the authoritative count comes from USACE WTLUS and must be entered manually
            into <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">data/wcsc-fleet.json</code>.
            Every PSIX-derived chart below covers the whole active-record dry-cargo category — trends and
            shares are informative, absolute totals overstate the working fleet.
          </p>
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {wcscCount != null ? (
          <StatCard
            label={`In-service (USACE WCSC${yearSuffix})`}
            value={wcscCount.toLocaleString()}
            accentColor={VESSEL_TYPE_COLOR.hopper_barge}
          />
        ) : (
          <StatCard
            label="Industry benchmark (in service)"
            value={`~${(ref?.industryBenchmarks.hopperBargesInService ?? 18000).toLocaleString()}`}
            accentColor={VESSEL_TYPE_COLOR.hopper_barge}
            sublabel="Waterways Journal fleet survey"
          />
        )}
        <StatCard
          label="PSIX active records"
          value={vessels.length.toLocaleString()}
          sublabel="all dry-cargo types, incl. retired hulls"
        />
        <StatCard label="Average age" value={averageAge(vessels, currentYear)?.toString() ?? "—"} sublabel="years (PSIX records)" />
        <StatCard label="Records 30+ years old" value={aging !== null ? `${aging}%` : "—"} sublabel="share of PSIX records" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Major fleets by name prefix"
          source="Fleet name prefix (ING = Ingram, ACBL, ART = ARTCo…) — a naming-convention proxy; PSIX has no owner field. Counts are PSIX records (incl. retired hulls), so read relative fleet sizes, not absolute counts."
        >
          <HBar data={prefixes} color={VESSEL_TYPE_COLOR.hopper_barge} unit="PSIX records" />
        </ChartCard>

        {wcsc?.topOperators?.hopperBarge ? (
          <ChartCard
            title={`Top hopper barge operators (WTLUS${yearSuffix})`}
            source="USACE WCSC operator of record — authoritative annual survey, not a proxy."
          >
            <HBar
              data={wcsc.topOperators.hopperBarge.map((o) => ({ label: o.name, value: o.count }))}
              color={VESSEL_TYPE_COLOR.hopper_barge}
              unit="barges"
            />
          </ChartCard>
        ) : (
          <ChartCard
            title="Reported operator fleets (trade press)"
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
        )}

        <ChartCard title="Build-year distribution" source="USCG PSIX build years, all active dry-cargo barge records.">
          <AgeHistogram data={computeAgeBuckets(vessels, currentYear)} color={VESSEL_TYPE_COLOR.hopper_barge} />
        </ChartCard>

        <ChartCard title="Fleet age composition" source="USCG PSIX build years, all active dry-cargo barge records.">
          <Donut data={ages} unit="records" />
        </ChartCard>

        <ChartCard
          title={`New-build deliveries per year (last 25 years)`}
          source="USCG PSIX build years. Recent years are the most reliable slice of the PSIX category, since new records are current."
        >
          <VBar data={deliveries} color={VESSEL_TYPE_COLOR.hopper_barge} unit="barges delivered" />
        </ChartCard>
      </div>
    </div>
  );
}
