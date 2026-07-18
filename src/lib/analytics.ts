import type { Vessel } from "@/lib/types";

/** Generic {label, value} point consumed by the chart components. */
export interface ChartPoint {
  label: string;
  value: number;
}

/** COI expirations bucketed by calendar quarter for the next `quarters` quarters. */
export function coiByQuarter(vessels: Vessel[], now: Date, quarters: number): ChartPoint[] {
  const buckets: ChartPoint[] = [];
  const counters = new Map<string, number>();
  for (let i = 0; i < quarters; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i * 3, 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `Q${q} '${String(d.getFullYear()).slice(2)}`;
    if (!counters.has(key)) counters.set(key, 0);
  }
  for (const v of vessels) {
    if (!v.coiExpirationDate) continue;
    const exp = new Date(v.coiExpirationDate);
    if (Number.isNaN(exp.getTime()) || exp < now) continue;
    const q = Math.floor(exp.getMonth() / 3) + 1;
    const key = `Q${q} '${String(exp.getFullYear()).slice(2)}`;
    if (counters.has(key)) counters.set(key, (counters.get(key) ?? 0) + 1);
  }
  for (const [label, value] of counters) buckets.push({ label, value });
  return buckets;
}

/**
 * Groups vessels by the leading alphabetic token of their name — barge fleets
 * are conventionally named with an operator prefix (KIRBY 27715, ACBL 3011,
 * ING 4782), so this approximates operator fleets. It is a naming-convention
 * proxy, not a registry of record: PSIX carries no owner/operator field at all,
 * so label it as such wherever shown.
 */
export function fleetNamePrefixes(vessels: Vessel[], top: number): ChartPoint[] {
  const counts = new Map<string, number>();
  for (const v of vessels) {
    const m = String(v.name ?? "").trim().match(/^([A-Za-z&.]+)/);
    if (!m || m[1].length < 2) continue; // skip pure-numeric and single-letter names
    const p = m[1].toUpperCase();
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([label, value]) => ({ label, value }));
}

/** New-vessel deliveries per build year over [fromYear, toYear]. */
export function deliveriesByYear(vessels: Vessel[], fromYear: number, toYear: number): ChartPoint[] {
  const counters = new Map<number, number>();
  for (let y = fromYear; y <= toYear; y++) counters.set(y, 0);
  for (const v of vessels) {
    if (v.buildYear && counters.has(v.buildYear)) {
      counters.set(v.buildYear, (counters.get(v.buildYear) ?? 0) + 1);
    }
  }
  return [...counters.entries()].map(([y, value]) => ({ label: `'${String(y).slice(2)}`, value }));
}

export const AGE_BANDS = ["0-9 yrs", "10-19 yrs", "20-29 yrs", "30+ yrs"] as const;

/** Fleet age composition across four bands (vessels without a build year excluded). */
export function ageComposition(vessels: Vessel[], currentYear: number): ChartPoint[] {
  const bands = [0, 0, 0, 0];
  for (const v of vessels) {
    if (!v.buildYear || v.buildYear < 1900 || v.buildYear > currentYear) continue;
    const age = currentYear - v.buildYear;
    bands[age < 10 ? 0 : age < 20 ? 1 : age < 30 ? 2 : 3] += 1;
  }
  return AGE_BANDS.map((label, i) => ({ label, value: bands[i] }));
}

/** Share of vessels 30+ years old, as a percentage (null if no build years). */
export function agingSharePct(vessels: Vessel[], currentYear: number): number | null {
  const withYear = vessels.filter((v) => v.buildYear && v.buildYear > 1900);
  if (withYear.length === 0) return null;
  const aging = withYear.filter((v) => currentYear - v.buildYear! >= 30).length;
  return Math.round((aging / withYear.length) * 1000) / 10;
}

/** Hull-length size classes for barges (vessels without dimensions excluded). */
export function sizeClasses(vessels: Vessel[]): ChartPoint[] {
  const defs: Array<{ label: string; min: number; max: number }> = [
    { label: "< 150 ft", min: 0, max: 150 },
    { label: "150-199 ft", min: 150, max: 200 },
    { label: "200-249 ft", min: 200, max: 250 },
    { label: "250-299 ft", min: 250, max: 300 },
    { label: "300+ ft", min: 300, max: Infinity },
  ];
  const counts = defs.map(() => 0);
  for (const v of vessels) {
    if (!v.lengthFeet || v.lengthFeet <= 0) continue;
    const i = defs.findIndex((d) => v.lengthFeet! >= d.min && v.lengthFeet! < d.max);
    if (i >= 0) counts[i] += 1;
  }
  return defs.map((d, i) => ({ label: d.label, value: counts[i] })).filter((p) => p.value > 0);
}

/** Turns a {name: count} breakdown into sorted chart points, grouping the tail into "Other". */
export function breakdownToPoints(
  breakdown: Record<string, number>,
  top: number,
  relabel?: Record<string, string>
): ChartPoint[] {
  const entries = Object.entries(breakdown)
    .map(([label, value]) => ({ label: relabel?.[label] ?? label, value }))
    .sort((a, b) => b.value - a.value);
  if (entries.length <= top) return entries;
  const head = entries.slice(0, top);
  const tail = entries.slice(top).reduce((s, e) => s + e.value, 0);
  return tail > 0 ? [...head, { label: "Other", value: tail }] : head;
}
