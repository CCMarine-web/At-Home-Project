import { readFileSync } from "node:fs";
import path from "node:path";
import type { Vessel, VesselType } from "@/lib/types";

export interface BenchmarkFlag {
  type: string;
  actual: number;
  benchmark: number;
  farOff: boolean;
}

export interface FleetData {
  generatedAt: string;
  testMode: boolean;
  vessels: Vessel[];
  counts: Record<VesselType, number>;
  benchmarkFlags: BenchmarkFlag[];
  methodology: {
    tankBarges?: string;
    hopperBarges: string;
    towboatsTugboats: string;
    towingSubtypeBreakdown: Record<string, number>;
  };
  source: {
    name: string;
    accessType: string;
    refreshCadence: string;
  };
}

let cached: FleetData | null = null;

export function getFleetData(): FleetData | null {
  if (cached) return cached;
  try {
    const filePath = path.join(process.cwd(), "data", "fleet-data.json");
    const raw = readFileSync(filePath, "utf-8");
    cached = JSON.parse(raw);
    return cached;
  } catch {
    return null;
  }
}

export function getVesselsByType(type: VesselType): Vessel[] {
  const data = getFleetData();
  if (!data) return [];
  return data.vessels.filter((v) => v.type === type);
}

export interface AgeBucket {
  label: string;
  count: number;
}

/** Buckets vessels into 5-year build-year bands for an age histogram. */
export function computeAgeBuckets(vessels: Vessel[], currentYear: number): AgeBucket[] {
  const withYear = vessels.filter((v) => v.buildYear && v.buildYear > 1900 && v.buildYear <= currentYear);
  if (withYear.length === 0) return [];

  const minYear = Math.min(...withYear.map((v) => v.buildYear!));
  const bandStart = Math.floor(minYear / 5) * 5;
  const buckets = new Map<number, number>();

  for (const v of withYear) {
    const band = Math.floor(v.buildYear! / 5) * 5;
    buckets.set(band, (buckets.get(band) ?? 0) + 1);
  }

  const result: AgeBucket[] = [];
  for (let band = bandStart; band <= Math.floor(currentYear / 5) * 5; band += 5) {
    result.push({ label: `${band}-${band + 4}`, count: buckets.get(band) ?? 0 });
  }
  return result;
}

export function averageAge(vessels: Vessel[], currentYear: number): number | null {
  const withYear = vessels.filter((v) => v.buildYear && v.buildYear > 1900);
  if (withYear.length === 0) return null;
  const totalAge = withYear.reduce((sum, v) => sum + (currentYear - v.buildYear!), 0);
  return Math.round((totalAge / withYear.length) * 10) / 10;
}

export interface CoiBuckets {
  expired: number;
  thisQuarter: number;
  thisYear: number;
  nextYear: number;
  later: number;
  noRecord: number;
}

function quarterEnd(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
}

export function computeCoiBuckets(tankBarges: Vessel[], now: Date): CoiBuckets {
  const buckets: CoiBuckets = {
    expired: 0,
    thisQuarter: 0,
    thisYear: 0,
    nextYear: 0,
    later: 0,
    noRecord: 0,
  };

  const qEnd = quarterEnd(now);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const nextYearEnd = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);

  for (const v of tankBarges) {
    if (!v.coiExpirationDate) {
      buckets.noRecord += 1;
      continue;
    }
    const exp = new Date(v.coiExpirationDate);
    if (Number.isNaN(exp.getTime())) {
      buckets.noRecord += 1;
      continue;
    }
    if (exp < now) buckets.expired += 1;
    else if (exp <= qEnd) buckets.thisQuarter += 1;
    else if (exp <= yearEnd) buckets.thisYear += 1;
    else if (exp <= nextYearEnd) buckets.nextYear += 1;
    else buckets.later += 1;
  }

  return buckets;
}

export interface CoiTimelinePoint {
  month: string;
  count: number;
}

/** Monthly COI expiration counts for the next 24 months, for a timeline chart. */
export function computeCoiTimeline(tankBarges: Vessel[], now: Date): CoiTimelinePoint[] {
  const months: CoiTimelinePoint[] = [];
  const counters = new Map<string, number>();

  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counters.set(key, 0);
  }

  for (const v of tankBarges) {
    if (!v.coiExpirationDate) continue;
    const exp = new Date(v.coiExpirationDate);
    if (Number.isNaN(exp.getTime()) || exp < now) continue;
    const key = `${exp.getFullYear()}-${String(exp.getMonth() + 1).padStart(2, "0")}`;
    if (counters.has(key)) {
      counters.set(key, (counters.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of counters) {
    const [year, month] = key.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    months.push({ month: label, count });
  }

  return months;
}
