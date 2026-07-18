import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Sourced industry reference figures (data/market-reference.json): BTS fleet
 * totals, Waterways Journal benchmarks, and trade-press operator fleet sizes.
 * Every figure was manually verified against the cited source on retrievedAt —
 * bts.gov and the trade press block automated tools, so these are refreshed by
 * hand, and each block carries its own citation for display in the UI.
 */
export interface MarketReference {
  retrievedAt: string;
  btsFleet: {
    source: string;
    sourceUrl: string;
    dataYear: number;
    counts: {
      drycargoBarges: number;
      tankBarges: number;
      towboatsAndTugs: number;
      selfPropelledDryCargo: number;
      selfPropelledTanker: number;
    };
    notes: string;
  };
  industryBenchmarks: {
    source: string;
    tankBargesInService: number;
    hopperBargesInService: number;
  };
  majorDryCargoOperators: {
    source: string;
    sourceUrl: string;
    totalBargeFleet: string;
    operators: Array<{ name: string; dryCargoBarges: number; approx: boolean }>;
  };
}

let cached: MarketReference | null = null;

export function getMarketReference(): MarketReference | null {
  if (cached) return cached;
  try {
    const filePath = path.join(process.cwd(), "data", "market-reference.json");
    cached = JSON.parse(readFileSync(filePath, "utf-8"));
    return cached;
  } catch {
    return null;
  }
}
