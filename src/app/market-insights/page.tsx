import Banner from "@/components/Banner";
import LastUpdated from "@/components/LastUpdated";
import { VESSEL_TYPE_COLOR, VESSEL_TYPE_LABEL } from "@/lib/colors";
import { averageAge, getFleetData, getVesselsByType } from "@/lib/fleetData";
import type { VesselType } from "@/lib/types";

const CURRENT_YEAR = 2026;
const VESSEL_TYPES: VesselType[] = ["tank_barge", "hopper_barge", "towboat", "tugboat"];

export default function MarketInsightsPage() {
  const data = getFleetData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-100">Market Insights</h2>
        <p className="mt-4 text-sm text-slate-300">No fleet data has been pulled yet.</p>
      </div>
    );
  }

  const rows = VESSEL_TYPES.map((type) => {
    const vessels = getVesselsByType(type);
    const withYear = vessels.filter((v) => v.buildYear);
    const newBuilds = withYear.filter((v) => CURRENT_YEAR - v.buildYear! <= 5).length;
    const aging = withYear.filter((v) => CURRENT_YEAR - v.buildYear! >= 30).length;
    return {
      type,
      count: vessels.length,
      avgAge: averageAge(vessels, CURRENT_YEAR),
      newBuilds,
      newBuildPct: withYear.length ? Math.round((newBuilds / withYear.length) * 1000) / 10 : null,
      aging,
      agingPct: withYear.length ? Math.round((aging / withYear.length) * 1000) / 10 : null,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Market Insights</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>
      <p className="max-w-3xl text-sm text-slate-300">
        Fleet age and replacement-trend statistics derived from the same PSIX pull as the other tabs. The
        Hopper Barges row carries the same category caveat described on that tab and in Data Sources.
      </p>

      <div className="overflow-auto rounded-lg border border-slate-800 bg-slate-900">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-300">Category</th>
              <th className="px-4 py-2 text-right font-medium text-slate-300">Count</th>
              <th className="px-4 py-2 text-right font-medium text-slate-300">Avg. age (yrs)</th>
              <th className="px-4 py-2 text-right font-medium text-slate-300">Built last 5 yrs</th>
              <th className="px-4 py-2 text-right font-medium text-slate-300">30+ years old</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.type}>
                <td className="px-4 py-2 font-medium text-slate-100">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ backgroundColor: VESSEL_TYPE_COLOR[r.type] }}
                  />
                  {VESSEL_TYPE_LABEL[r.type]}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{r.count.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.avgAge ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.newBuilds.toLocaleString()} {r.newBuildPct !== null && `(${r.newBuildPct}%)`}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.aging.toLocaleString()} {r.agingPct !== null && `(${r.agingPct}%)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Reading the replacement trend</h3>
        <p className="mt-2 text-sm text-slate-300">
          A high share of vessels built in the last 5 years alongside a high share of vessels 30+ years old
          points to an actively-replaced fleet with a long working tail — common for barges and towing
          vessels, which have long service lives with periodic recertification rather than fixed retirement
          ages. A category skewed heavily toward the 30+ year band with little recent new-build activity is
          a candidate for closer attention on replacement planning.
        </p>
      </div>

      <Banner status="warning" title="Cross-checking against industry reporting">
        <p>
          The Waterways Journal publishes an annual barge fleet survey and periodic towboat fleet articles
          with operator-level detail (e.g. individual companies' towboat counts) that this app does not
          pull programmatically — that reporting is partially subscription-gated and not a queryable data
          source. Use it as a qualitative cross-check against the figures above, not as a data feed.
        </p>
      </Banner>
    </div>
  );
}
