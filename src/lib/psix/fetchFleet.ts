import { asArray, callPsixOperation } from "./client";
import type {
  PsixServiceType,
  PsixVesselDimensionRow,
  PsixVesselDocumentRow,
  PsixVesselParticularsRow,
  PsixVesselSummaryRow,
} from "./types";

export async function getVesselSummaries(
  service: PsixServiceType
): Promise<PsixVesselSummaryRow[]> {
  const parsed = await callPsixOperation(
    "getVesselSummaryXMLString",
    `<VesselID></VesselID><VesselName></VesselName><CallSign></CallSign><VIN></VIN><HIN></HIN><Flag></Flag><Service>${service}</Service><BuildYear></BuildYear>`
  );
  return asArray(
    (parsed as { NewDataSet?: { VesselSummary?: PsixVesselSummaryRow | PsixVesselSummaryRow[] } })
      .NewDataSet?.VesselSummary
  );
}

export async function getVesselParticulars(
  vesselId: string
): Promise<PsixVesselParticularsRow | null> {
  const parsed = await callPsixOperation(
    "getVesselParticularsXMLString",
    `<VesselID>${vesselId}</VesselID>`
  );
  const row = (
    parsed as { NewDataSet?: { VesselParticulars?: PsixVesselParticularsRow } }
  ).NewDataSet?.VesselParticulars;
  return row ?? null;
}

export async function getVesselDimensions(
  vesselId: string
): Promise<PsixVesselDimensionRow[]> {
  const parsed = await callPsixOperation(
    "getVesselDimensionsXMLString",
    `<VesselID>${vesselId}</VesselID>`
  );
  return asArray(
    (parsed as { NewDataSet?: { VesselDimensions?: PsixVesselDimensionRow | PsixVesselDimensionRow[] } })
      .NewDataSet?.VesselDimensions
  );
}

export async function getVesselDocuments(
  vesselId: string
): Promise<PsixVesselDocumentRow[]> {
  const parsed = await callPsixOperation(
    "getVesselDocumentsXMLString",
    `<VesselID>${vesselId}</VesselID>`
  );
  return asArray(
    (parsed as { NewDataSet?: { VesselDocuments?: PsixVesselDocumentRow | PsixVesselDocumentRow[] } })
      .NewDataSet?.VesselDocuments
  );
}

/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once.
 * A single failed item is recorded and skipped rather than aborting the whole run,
 * since a multi-hour pipeline over tens of thousands of vessels will hit occasional
 * one-off errors that shouldn't throw away everything already fetched.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number, failed: number) => void
): Promise<{ results: (R | null)[]; failures: { index: number; error: string }[] }> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  const failures: { index: number; error: string }[] = [];
  let nextIndex = 0;
  let done = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await fn(items[index], index);
      } catch (err) {
        failures.push({
          index,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      done += 1;
      onProgress?.(done, items.length, failures.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);

  return { results, failures };
}
