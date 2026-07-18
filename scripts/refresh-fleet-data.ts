/**
 * Pulls the current US inland/coastal tank barge, hopper barge, towboat, and
 * tugboat fleet from USCG PSIX and writes the result to data/fleet-data.json.
 *
 * Meant to be triggered by a GitHub Actions workflow — either on a schedule
 * or by a person clicking "Run workflow" in GitHub's UI. Checkpoints progress
 * to data/.checkpoint.json so an interrupted run can resume instead of
 * starting over.
 *
 * Two real limitations discovered while building this (see docs/data-methodology.md):
 *  - PSIX has no field that isolates hopper barges from other dry-cargo
 *    barges, so every active "Freight Barge" is counted as a hopper barge.
 *    This is PSIX's whole dry-cargo-barge category, not a verified
 *    hopper-barge-only count, and must stay disclosed wherever it's shown.
 *  - PSIX has no "Towboat"/"Tugboat" hull-type field. The split here uses
 *    PSIX's operating-area sub-type (inland/river vs. coastal/ocean) as an
 *    industry-standard proxy, not a literal Coast Guard classification.
 *
 * Run directly with: npx tsx scripts/refresh-fleet-data.ts
 * Limit to a small sample for testing with: npx tsx scripts/refresh-fleet-data.ts --limit 25
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getVesselDimensions,
  getVesselDocuments,
  getVesselParticulars,
  getVesselSummaries,
  mapWithConcurrency,
} from "../src/lib/psix/fetchFleet";
import { classifyTowingVesselSubType } from "../src/lib/psix/classify";
import { PSIX_LANES } from "../src/lib/psix/client";
import type { PsixServiceType, PsixVesselSummaryRow } from "../src/lib/psix/types";
import type { Vessel, VesselType } from "../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_PATH = path.join(DATA_DIR, "fleet-data.json");
const CHECKPOINT_PATH = path.join(DATA_DIR, ".checkpoint.json");

const BENCHMARKS: Partial<Record<VesselType, number>> = {
  tank_barge: 4000,
  hopper_barge: 18000,
};

interface Checkpoint {
  towingSubTypes: Record<string, string>;
  documents: Record<string, { issue: string | null; expiration: string | null; status: string | null }>;
  /** Cargo sub-type + hull dimensions, fetched only for in-service tank barges. */
  tankDetails: Record<string, { subType: string; length: number | null; breadth: number | null }>;
}

function parseLimitArg(): number | null {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1) return null;
  const value = Number(process.argv[idx + 1]);
  return Number.isFinite(value) ? value : null;
}

async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const raw = await readFile(CHECKPOINT_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { towingSubTypes: {}, documents: {}, tankDetails: {}, ...parsed };
  } catch {
    return { towingSubTypes: {}, documents: {}, tankDetails: {} };
  }
}

async function saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CHECKPOINT_PATH, JSON.stringify(checkpoint), "utf-8");
}

function buildYearOf(row: PsixVesselSummaryRow): number | null {
  const year = Number(row.ConstructionCompletedYear);
  return Number.isFinite(year) && year > 0 ? year : null;
}

/** Picks the most recently issued Certificate of Inspection (or amendment) for a vessel. */
function extractLatestCoi(
  documents: Awaited<ReturnType<typeof getVesselDocuments>>
): { issue: string | null; expiration: string | null; status: string | null } {
  const coiDocs = documents.filter((d) =>
    (d.TypeLookupName ?? "").toLowerCase().includes("certificate of inspection")
  );
  if (coiDocs.length === 0) {
    return { issue: null, expiration: null, status: null };
  }
  const sorted = [...coiDocs].sort(
    (a, b) => new Date(b.IssueDtTm ?? 0).getTime() - new Date(a.IssueDtTm ?? 0).getTime()
  );
  const latest = sorted[0];
  return {
    issue: latest.IssueDtTm ?? null,
    expiration: latest.ExpiredDtTm ?? null,
    status: latest.StatusLookupName ?? null,
  };
}

async function main() {
  const limit = parseLimitArg();
  const startedAt = Date.now();
  console.log(`Starting fleet refresh${limit ? ` (TEST MODE, limit=${limit} per category)` : ""}...`);

  console.log("\n[1/6] Fetching vessel summaries for each PSIX service category...");
  const serviceTypes: PsixServiceType[] = ["Tank Barge", "Freight Barge", "Towing Vessel"];
  const active: Record<PsixServiceType, PsixVesselSummaryRow[]> = {
    "Tank Barge": [],
    "Freight Barge": [],
    "Towing Vessel": [],
  };

  for (const service of serviceTypes) {
    const rows = await getVesselSummaries(service);
    const activeUs = rows.filter(
      (r) => r.StatusLookupName === "Active" && r.CountryLookupName === "UNITED STATES"
    );
    active[service] = limit ? activeUs.slice(0, limit) : activeUs;
    console.log(
      `  ${service}: ${rows.length} total records, ${activeUs.length} active/US-flagged${
        limit ? `, using ${active[service].length} for this test run` : ""
      }`
    );
  }

  // Tank Barge and Freight Barge classify directly from their top-level PSIX
  // category (see file header for the Freight Barge -> hopper_barge caveat).
  // Only Towing Vessel needs a per-vessel particulars lookup, since the
  // towboat/tugboat proxy depends on ServiceSubType.
  console.log("\n[2/6] Fetching per-vessel service sub-type for Towing Vessels (for the towboat/tugboat proxy)...");
  const checkpoint = await loadCheckpoint();
  const towingRows = active["Towing Vessel"];
  const stillNeeded = towingRows.filter(
    (row) => checkpoint.towingSubTypes[String(row.VesselId)] === undefined
  );
  console.log(
    `  ${towingRows.length} towing vessels, ${towingRows.length - stillNeeded.length} already cached, ${stillNeeded.length} to fetch`
  );

  let sinceCheckpoint = 0;
  await mapWithConcurrency(
    stillNeeded,
    PSIX_LANES,
    async (row) => {
      const particulars = await getVesselParticulars(String(row.VesselId));
      checkpoint.towingSubTypes[String(row.VesselId)] = particulars?.ServiceSubType ?? "";
      sinceCheckpoint += 1;
      if (sinceCheckpoint % 100 === 0) await saveCheckpoint(checkpoint);
      return particulars;
    },
    (done, total, failed) => {
      if (done % 250 === 0 || done === total) {
        console.log(`  towing particulars: ${done}/${total} (${failed} failed so far)`);
      }
    }
  );
  await saveCheckpoint(checkpoint);

  console.log("\n[3/6] Classifying vessels and fetching COI documents for tank barges...");
  const towingSubtypeBreakdown: Record<string, number> = {};
  const classified: Array<{
    vesselId: string;
    name: string;
    buildYear: number | null;
    type: VesselType;
    serviceSubType: string;
  }> = [];

  for (const row of active["Tank Barge"]) {
    classified.push({
      vesselId: String(row.VesselId),
      name: row.VesselName ?? "",
      buildYear: buildYearOf(row),
      type: "tank_barge",
      serviceSubType: "",
    });
  }

  for (const row of active["Freight Barge"]) {
    classified.push({
      vesselId: String(row.VesselId),
      name: row.VesselName ?? "",
      buildYear: buildYearOf(row),
      type: "hopper_barge",
      serviceSubType: "",
    });
  }

  for (const row of towingRows) {
    const subType = checkpoint.towingSubTypes[String(row.VesselId)] ?? "";
    towingSubtypeBreakdown[subType || "(none)"] = (towingSubtypeBreakdown[subType || "(none)"] || 0) + 1;
    const type = classifyTowingVesselSubType(subType);
    if (type !== "other") {
      classified.push({
        vesselId: String(row.VesselId),
        name: row.VesselName ?? "",
        buildYear: buildYearOf(row),
        type,
        serviceSubType: subType,
      });
    }
  }

  const tankBarges = classified.filter((v) => v.type === "tank_barge");
  const stillNeedDocs = tankBarges.filter((v) => checkpoint.documents[v.vesselId] === undefined);
  console.log(
    `  ${tankBarges.length} tank barges total, ${tankBarges.length - stillNeedDocs.length} COI records already cached, ${stillNeedDocs.length} to fetch`
  );

  let docsSinceCheckpoint = 0;
  await mapWithConcurrency(
    stillNeedDocs,
    PSIX_LANES,
    async (vessel) => {
      const docs = await getVesselDocuments(vessel.vesselId);
      checkpoint.documents[vessel.vesselId] = extractLatestCoi(docs);
      docsSinceCheckpoint += 1;
      if (docsSinceCheckpoint % 100 === 0) await saveCheckpoint(checkpoint);
      return docs;
    },
    (done, total, failed) => {
      if (done % 100 === 0 || done === total) {
        console.log(`  COI documents: ${done}/${total} (${failed} failed so far)`);
      }
    }
  );
  await saveCheckpoint(checkpoint);

  // COI-in-force = latest COI's expiration date is still in the future.
  const coiInForce = (id: string): boolean => {
    const exp = checkpoint.documents[id]?.expiration;
    if (!exp) return false;
    const t = new Date(exp).getTime();
    return Number.isFinite(t) && t >= startedAt;
  };

  // Towing vessels are inspected under 46 CFR Subchapter M (COIs required for
  // the whole US towing fleet since July 2022), so a current COI is a real
  // in-service signal for them just as it is for tank barges. Fetch documents
  // for EVERY active towing record -- not just the towboat/tugboat-classified
  // subset -- so the total in-service towing fleet can be reported accurately.
  console.log("\n[4/6] Fetching COI documents for all active Towing Vessel records (Subchapter M)...");
  const towingIds = active["Towing Vessel"].map((r) => String(r.VesselId));
  const towingNeedDocs = towingIds.filter((id) => checkpoint.documents[id] === undefined);
  console.log(
    `  ${towingIds.length} towing vessels, ${towingIds.length - towingNeedDocs.length} already cached, ${towingNeedDocs.length} to fetch`
  );
  let towDocsSinceCheckpoint = 0;
  await mapWithConcurrency(
    towingNeedDocs,
    PSIX_LANES,
    async (id) => {
      const docs = await getVesselDocuments(id);
      checkpoint.documents[id] = extractLatestCoi(docs);
      towDocsSinceCheckpoint += 1;
      if (towDocsSinceCheckpoint % 100 === 0) await saveCheckpoint(checkpoint);
      return docs;
    },
    (done, total, failed) => {
      if (done % 250 === 0 || done === total) {
        console.log(`  towing COI documents: ${done}/${total} (${failed} failed so far)`);
      }
    }
  );
  await saveCheckpoint(checkpoint);

  // In-service filtering for tank barges (see docs/data-methodology.md):
  // a tank barge legally cannot carry cargo without a valid COI, and MISLE's
  // coarse "Active" record-status keeps scrapped hulls for decades (GAO-20-562).
  const inServiceTankIds = tankBarges.filter((v) => coiInForce(v.vesselId)).map((v) => v.vesselId);

  console.log("\n[5/6] Fetching cargo sub-type and hull dimensions for in-service tank barges...");
  const tanksNeedDetails = inServiceTankIds.filter((id) => checkpoint.tankDetails[id] === undefined);
  console.log(
    `  ${inServiceTankIds.length} in-service tank barges, ${inServiceTankIds.length - tanksNeedDetails.length} already cached, ${tanksNeedDetails.length} to fetch`
  );
  let detailsSinceCheckpoint = 0;
  await mapWithConcurrency(
    tanksNeedDetails,
    PSIX_LANES,
    async (id) => {
      const particulars = await getVesselParticulars(id);
      const dims = await getVesselDimensions(id);
      const hull =
        dims.find((d) => (d.DimensionTypeLookupName ?? "").includes("Simplified") && d.LengthInFeet) ??
        dims.find((d) => d.LengthInFeet);
      checkpoint.tankDetails[id] = {
        subType: particulars?.ServiceSubType ?? "",
        length: typeof hull?.LengthInFeet === "number" ? hull.LengthInFeet : null,
        breadth: typeof hull?.BreadthInFeet === "number" ? hull.BreadthInFeet : null,
      };
      detailsSinceCheckpoint += 1;
      if (detailsSinceCheckpoint % 100 === 0) await saveCheckpoint(checkpoint);
      return null;
    },
    (done, total, failed) => {
      if (done % 250 === 0 || done === total) {
        console.log(`  tank details: ${done}/${total} (${failed} failed so far)`);
      }
    }
  );
  await saveCheckpoint(checkpoint);

  console.log("\n[6/6] Building final dataset...");
  const allClassified: Vessel[] = classified.map((v) => {
    const coi = checkpoint.documents[v.vesselId];
    const details = v.type === "tank_barge" ? checkpoint.tankDetails[v.vesselId] : undefined;
    return {
      id: v.vesselId,
      name: v.name,
      type: v.type,
      serviceSubType: details?.subType || v.serviceSubType,
      buildYear: v.buildYear,
      coiIssueDate: coi?.issue ?? null,
      coiExpirationDate: coi?.expiration ?? null,
      coiStatus: coi?.status ?? null,
      lengthFeet: details?.length ?? null,
      breadthFeet: details?.breadth ?? null,
      grossTons: null,
      horsepower: null,
    };
  });

  const rawTankBarges = allClassified.filter((v) => v.type === "tank_barge").length;
  const vessels: Vessel[] = allClassified.filter((v) =>
    v.type === "tank_barge" ? coiInForce(v.id) : true
  );
  const keptTankBarges = vessels.filter((v) => v.type === "tank_barge").length;
  console.log(
    `  tank barges: ${keptTankBarges} in service (unexpired COI), dropped ${
      rawTankBarges - keptTankBarges
    } with expired or missing COI`
  );

  const counts: Record<VesselType, number> = {
    tank_barge: 0,
    hopper_barge: 0,
    towboat: 0,
    tugboat: 0,
  };
  for (const v of vessels) counts[v.type] += 1;

  // In-service counts: COI-in-force for the inspected categories (tank barges,
  // Subchapter M towing vessels); hopper/freight barges are uninspected, so no
  // COI signal exists and the in-service figure must come from WCSC (manual).
  const inServiceCounts = {
    tank_barge: keptTankBarges,
    hopper_barge: null as number | null,
    towboat: vessels.filter((v) => v.type === "towboat" && coiInForce(v.id)).length,
    tugboat: vessels.filter((v) => v.type === "tugboat" && coiInForce(v.id)).length,
  };

  const towingFleet = {
    activeRecords: towingIds.length,
    withCoiRecord: towingIds.filter((id) => checkpoint.documents[id]?.expiration).length,
    coiInForce: towingIds.filter((id) => coiInForce(id)).length,
  };

  const tankSubtypeBreakdown: Record<string, number> = {};
  for (const id of inServiceTankIds) {
    const s = checkpoint.tankDetails[id]?.subType || "(none)";
    tankSubtypeBreakdown[s] = (tankSubtypeBreakdown[s] || 0) + 1;
  }

  const benchmarkFlags = Object.entries(BENCHMARKS).map(([type, benchmark]) => {
    const actual = counts[type as VesselType];
    const ratio = actual / benchmark;
    return { type, actual, benchmark, farOff: ratio > 1.5 || ratio < 0.67 };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    testMode: Boolean(limit),
    vessels,
    counts,
    inServiceCounts,
    towingFleet,
    tankSubtypeBreakdown,
    benchmarkFlags,
    methodology: {
      towingInService:
        "Towing vessels are inspected under 46 CFR Subchapter M -- COIs have been required across the US towing fleet since July 2022 -- so a towing vessel whose latest COI is unexpired is counted as in service. Towboat/tugboat headline counts use this filter; vessels with no COI on record in PSIX remain in the table but are excluded from the in-service figure.",
      tankBarges:
        "Counted only tank barges whose latest Certificate of Inspection is unexpired as of the pull date. A valid COI is legally required to carry cargo, so barges with an expired or missing COI -- retired/scrapped hulls that MISLE still flags 'Active' (GAO-20-562) -- are excluded. This drops the raw active count (~8,000) to the in-service fleet (~4,400), in line with industry figures.",
      hopperBarges:
        "PSIX has no field that isolates hopper barges from other dry-cargo barges (a representative sample of the 'Freight Barge' category came back ~98% generic 'General'). Per an explicit decision, this count is PSIX's ENTIRE active Freight Barge category (hopper, deck, container, and other dry-cargo barges combined), not a verified hopper-barge-only figure.",
      towboatsTugboats:
        "PSIX has no 'Towboat'/'Tugboat' hull-type field. This split uses PSIX's operating-area sub-type (inland/river/canal/linehaul/fleeting = towboat; ocean/near-coastal/Great Lakes = tugboat) as an industry-standard proxy, not a literal Coast Guard classification. Vessels with an unrecognized or generic sub-type ('General', 'Other') are excluded from both counts.",
      towingSubtypeBreakdown,
    },
    source: {
      name: "USCG PSIX / CGMIX",
      accessType: "periodic_snapshot",
      refreshCadence:
        "PSIX itself is a weekly FOIA snapshot; this pull can be re-run manually or on a schedule",
    },
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log(`\nDone in ${elapsedMin} minutes. Wrote ${vessels.length} vessels to ${OUTPUT_PATH}`);
  console.log("Counts:", counts);
  console.log("Benchmark check:", benchmarkFlags);
}

main().catch((err) => {
  console.error("REFRESH FAILED:", err);
  process.exit(1);
});
