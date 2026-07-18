import LastUpdated from "@/components/LastUpdated";
import StatCard from "@/components/StatCard";
import CoiTimelineChart from "@/components/charts/CoiTimelineChart";
import VesselTable from "@/components/VesselTable";
import { STATUS_COLOR } from "@/lib/colors";
import { computeCoiBuckets, computeCoiTimeline, getFleetData } from "@/lib/fleetData";

const NOW = new Date("2026-07-16");
const NOW_ISO = NOW.toISOString();

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

  const tankBarges = data.vessels.filter((v) => v.type === "tank_barge");
  const coi = computeCoiBuckets(tankBarges, NOW);
  const timeline = computeCoiTimeline(tankBarges, NOW);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-100">Drydocking</h2>
        <LastUpdated generatedAt={data.generatedAt} />
      </div>
      <p className="max-w-3xl text-sm text-slate-300">
        Tank barge Certificate of Inspection (COI) expirations, based on the most recently issued COI or
        amendment on file in USCG PSIX for each active tank barge.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Already expired" value={coi.expired.toLocaleString()} accentColor={STATUS_COLOR.critical} />
        <StatCard label="This quarter" value={coi.thisQuarter.toLocaleString()} accentColor={STATUS_COLOR.warning} />
        <StatCard label="This year" value={coi.thisYear.toLocaleString()} accentColor={STATUS_COLOR.warning} />
        <StatCard label="Next year" value={coi.nextYear.toLocaleString()} />
        <StatCard label="No COI on record" value={coi.noRecord.toLocaleString()} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-100">Upcoming COI expirations by month (next 24 months)</h3>
        <CoiTimelineChart data={timeline} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">All tank barges</h3>
        <VesselTable vessels={tankBarges} now={NOW_ISO} />
      </div>
    </div>
  );
}
