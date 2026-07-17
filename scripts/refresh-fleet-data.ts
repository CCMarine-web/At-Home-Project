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
    return JSON.parse(raw);
  } catch {
    return { towingSubTypes: {}, documents: {} };
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

  console.log("\n[1/4] Fetching vessel summaries for each PSIX service category...");
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
  console.log("\n[2/4] Fetching per-vessel service sub-type for Towing Vessels (for the towboat/tugboat proxy)...");
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

  console.log("\n[3/4] Classifying vessels and fetching COI documents for tank barges...");
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

  console.log("\n[4/4] Building final dataset...");
  const vessels: Vessel[] = classified.map((v) => {
    const coi = checkpoint.documents[v.vesselId];
    return {
      id: v.vesselId,
      name: v.name,
      type: v.type,
      serviceSubType: v.serviceSubType,
      buildYear: v.buildYear,
      coiIssueDate: coi?.issue ?? null,
      coiExpirationDate: coi?.expiration ?? null,
      grossTons: null,
      horsepower: null,
    };
  });

  const counts: Record<VesselType, number> = {
    tank_barge: 0,
    hopper_barge: 0,
    towboat: 0,
    tugboat: 0,
  };
  for (const v of vessels) counts[v.type] += 1;

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
    benchmarkFlags,
    methodology: {
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
