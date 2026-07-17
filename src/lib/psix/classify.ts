import type { VesselType } from "@/lib/types";

/**
 * PSIX's top-level "Service" search categories are broader than our four tabs.
 *
 * Freight Barge: PSIX has no field that isolates hopper barges from other
 * dry-cargo barges (a representative sample came back ~98% generic "General").
 * Per an explicit decision, every active Freight Barge is counted as a Hopper
 * Barge for this app — this is a real limitation, not a refinement, and must
 * stay visibly disclosed everywhere this count is shown (Hopper Barges tab,
 * Dashboard, Data Sources) as "PSIX's whole dry-cargo-barge category, not a
 * verified hopper-barge-only count."
 *
 * Towing Vessel: PSIX's ServiceSubType here is an *operating-area*
 * classification (inland/river vs. coastal/ocean), not a hull-type label —
 * there is no literal "Towboat" or "Tugboat" value anywhere in PSIX. Industry
 * practice roughly maps inland/river operation to towboats and coastal/ocean
 * operation to tugboats, so that's used here as a documented proxy. It is not
 * a Coast Guard hull-type classification and should be labeled as a proxy
 * wherever it's shown.
 */
const INLAND_TOWING_SUBTYPES = ["inland", "linehaul", "fleeting", "locking river", "canal", "river"];
const COASTAL_TOWING_SUBTYPES = ["ocean", "near coastal", "great lakes", "coastal"];

export function classifyTowingVesselSubType(
  serviceSubType: string | undefined
): VesselType | "other" {
  const s = (serviceSubType ?? "").toLowerCase();
  if (INLAND_TOWING_SUBTYPES.some((kw) => s.includes(kw))) return "towboat";
  if (COASTAL_TOWING_SUBTYPES.some((kw) => s.includes(kw))) return "tugboat";
  return "other";
}
