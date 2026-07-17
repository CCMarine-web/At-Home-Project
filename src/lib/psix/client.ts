import { XMLParser } from "fast-xml-parser";

const ENDPOINT = "https://cgmix.uscg.mil/xml/psixdata.asmx";

// PSIX is a small government server, not built for heavy automated traffic.
// A burst of requests during development was enough to trigger what looks like
// a soft throttle: valid HTTP 200 responses with an empty result instead of an
// error. To stay a good citizen (and to get reliable data), every real fetch
// goes through this client, which paces requests across a small fixed number
// of independent "lanes" (each individually rate-limited) and treats
// "suspiciously empty" responses as a signal to slow down and retry rather
// than as "zero results." A full fleet refresh touches ~70,000+ vessels, so
// pure serial pacing (one request at a time) would take about half a day;
// a few gentle lanes keeps total runtime reasonable without hammering the server.
const MIN_DELAY_MS = 500;
const LANES = 4;
const MAX_RETRIES = 5;

const parser = new XMLParser({ ignoreAttributes: true });

const laneNextAvailable = new Array(LANES).fill(0);
let nextLane = 0;

async function waitForSlot(minDelayMs: number) {
  const lane = nextLane;
  nextLane = (nextLane + 1) % LANES;

  const now = Date.now();
  const scheduledAt = Math.max(now, laneNextAvailable[lane]);
  laneNextAvailable[lane] = scheduledAt + minDelayMs;

  const wait = scheduledAt - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

function buildSoapEnvelope(operation: string, paramsXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${operation} xmlns="https://cgmix.uscg.mil">
      ${paramsXml}
    </${operation}>
  </soap:Body>
</soap:Envelope>`;
}

export class PsixEmptyResponseError extends Error {
  constructor(operation: string) {
    super(`PSIX returned an empty result for ${operation} (likely throttled)`);
    this.name = "PsixEmptyResponseError";
  }
}

/**
 * Calls one PSIX "...XMLString" SOAP operation and returns the parsed rows
 * from the inner <NewDataSet>. Retries with backoff on network errors, non-200
 * responses, and empty-but-200 responses (the throttle signature described above).
 */
export async function callPsixOperation(
  operation: string,
  paramsXml: string,
  options?: { minDelayMs?: number; maxRetries?: number }
): Promise<Record<string, unknown>> {
  const minDelayMs = options?.minDelayMs ?? MIN_DELAY_MS;
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const body = buildSoapEnvelope(operation, paramsXml);

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    attempt += 1;
    await waitForSlot(minDelayMs);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `https://cgmix.uscg.mil/${operation}`,
        },
        body,
      });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`PSIX HTTP ${res.status} for ${operation}: ${text.slice(0, 300)}`);
      }

      const outer = parser.parse(text);
      const respObj = outer?.["soap:Envelope"]?.["soap:Body"]?.[`${operation}Response`];
      const innerXmlString = respObj?.[`${operation}Result`];

      if (!innerXmlString) {
        throw new PsixEmptyResponseError(operation);
      }

      return parser.parse(innerXmlString);
    } catch (err) {
      lastError = err;
      const backoffMs = minDelayMs * 2 ** attempt + Math.random() * 500;
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`PSIX call to ${operation} failed after ${maxRetries} retries`);
}

export const PSIX_LANES = LANES;

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
