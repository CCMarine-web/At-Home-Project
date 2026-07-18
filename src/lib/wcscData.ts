import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The USACE WCSC / WTLUS in-service fleet counts.
 *
 * Unlike the PSIX data (weekly, automated), this is the authoritative annual
 * national vessel inventory and must be retrieved manually — the WCSC portal
 * blocks automated tools. It lives in data/wcsc-fleet.json; that file carries
 * its own step-by-step update instructions. Any value may be null until a real
 * WTLUS figure has been entered, in which case the UI shows an
 * "awaiting WTLUS" notice instead of inventing a number.
 */
export interface WcscBucket {
  label: string;
  count: number;
}

export interface WcscFleet {
  source: string;
  sourceUrl: string;
  retrievalMethod: string;
  dataYear: number | null;
  retrievedAt: string | null;
  howToUpdate: string[];
  counts: {
    dryCargoBarge: number | null;
    hopperBarge: number | null;
    deckBarge: number | null;
    tankBarge: number | null;
    towboatTugboat: number | null;
  };
  deckBargeSizeRanges: WcscBucket[] | null;
  towboatHpClasses: WcscBucket[] | null;
}

let cached: WcscFleet | null = null;

export function getWcscFleet(): WcscFleet | null {
  if (cached) return cached;
  try {
    const filePath = path.join(process.cwd(), "data", "wcsc-fleet.json");
    cached = JSON.parse(readFileSync(filePath, "utf-8"));
    return cached;
  } catch {
    return null;
  }
}
