import LastUpdated from "@/components/LastUpdated";
import { getFleetData } from "@/lib/fleetData";

interface SourceCardProps {
  name: string;
  status: "used" | "unavailable" | "cross-check-only";
  children: React.ReactNode;
}

function SourceCard({ name, status, children }: SourceCardProps) {
  const statusLabel = {
    used: { text: "In use", cls: "bg-emerald-100 text-emerald-700" },
    unavailable: { text: "Unavailable", cls: "bg-red-100 text-red-700" },
    "cross-check-only": { text: "Cross-check only", cls: "bg-amber-100 text-amber-700" },
  }[status];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel.cls}`}>
          {statusLabel.text}
        </span>
      </div>
      <div className="mt-2 space-y-2 text-sm text-slate-700">{children}</div>
    </div>
  );
}

export default function DataSourcesPage() {
  const data = getFleetData();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">Data Sources</h2>
        {data && <LastUpdated generatedAt={data.generatedAt} />}
      </div>
      <p className="max-w-3xl text-sm text-slate-600">
        Every source this app was built to use, what it actually provides, how it refreshes, and what its
        real limitations are. Nothing here is estimated or invented — where a data point isn&apos;t
        available, it says so.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SourceCard name="USCG PSIX / CGMIX (Port State Information Exchange)" status="used">
          <p>
            <strong>What it provides:</strong> vessel service type/sub-type (tank barge, dry-cargo/&quot;freight&quot;
            barge, towing vessel and its operating-area sub-type), build year, flag/country, and Certificate
            of Inspection issue/expiration dates. Accessed via a documented SOAP/XML web service
            (psixdata.asmx), not by scraping a web form.
          </p>
          <p>
            <strong>Refresh cadence:</strong> PSIX itself is a weekly FOIA snapshot of USCG&apos;s internal MISLE
            system, not a real-time feed. This app pulls from it on demand (see below) — the timestamp
            shown on every tab is when this app last pulled, not necessarily when PSIX itself last updated
            internally.
          </p>
          <p>
            <strong>Known limitations:</strong> A 2020 GAO report (GAO-20-562) found MISLE — the system PSIX
            is drawn from — has duplicate and incomplete vessel records and inconsistent data entry that
            USCG has not fully root-caused. Treat counts as best-available, not exact.
          </p>
        </SourceCard>

        <SourceCard name="Hopper Barges classification" status="used">
          <p>{data?.methodology.hopperBarges ?? "Methodology details are populated after the first data pull."}</p>
        </SourceCard>

        <SourceCard name="Towboat / Tugboat classification" status="used">
          <p>{data?.methodology.towboatsTugboats ?? "Methodology details are populated after the first data pull."}</p>
        </SourceCard>

        <SourceCard name="Horsepower (Towboats / Tugboats tabs)" status="unavailable">
          <p>
            No free, programmatically-accessible, per-vessel horsepower source was found. PSIX does not
            carry it. MARAD&apos;s public fleet dashboard turned out to cover only the ~188-vessel deep-sea
            U.S.-flag fleet (tankers, containerships) — the wrong fleet segment entirely, not inland/coastal
            barges and towing vessels. This is shown as unavailable rather than estimated.
          </p>
        </SourceCard>

        <SourceCard name="USACE Waterborne Commerce Statistics Center (WCSC)" status="unavailable">
          <p>
            WCSC&apos;s &quot;Waterborne Transportation Lines of the United States&quot; dataset is the traditional
            source behind national tank/hopper barge benchmark figures, and per a Google-indexed page
            description is collected annually with roughly a one-year publication lag. Its current data
            portal (ndc.ops.usace.army.mil/wcsc/webpub) is a JavaScript application that this app&apos;s
            automated tools could not read the contents of, and USACE&apos;s static description pages returned
            HTTP 403 to automated requests during development. Not wired in — would need either browser-automation
            tooling or a direct records request to USACE to unlock.
          </p>
        </SourceCard>

        <SourceCard name="MarineCadastre.gov / AIS vessel-traffic data" status="unavailable">
          <p>
            Confirmed genuinely programmatic (bulk annual/daily files, no scraping needed) but carries only
            AIS broadcast fields (position, speed, dimensions, a broad type code) — no COI, horsepower, or
            build year. Not useful for this app&apos;s tabs; not wired in.
          </p>
        </SourceCard>

        <SourceCard name="Waterways Journal / American Waterways Operators" status="cross-check-only">
          <p>
            Trade-press and industry-association reporting (annual barge fleet survey, towboat fleet
            articles, an AWO/PwC economic-impact study) used only to sanity-check PSIX-derived totals — e.g.
            the ~4,000 tank barge / ~18,000 hopper barge figures referenced on other tabs. Partially
            subscription-gated, not an API, and not wired into the automated pipeline.
          </p>
        </SourceCard>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">How the refresh works</h3>
        <p className="mt-2 text-sm text-slate-700">
          A script (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run refresh-data</code>)
          queries PSIX for active, US-flagged vessels in each category, looks up the operating-area
          sub-type for towing vessels, and pulls the latest Certificate of Inspection for tank barges — all
          at a deliberately gentle pace so as not to overload a small government server. The result is
          written to a single data file that this whole app reads from. See the README for how to trigger
          this without writing any code.
        </p>
      </div>
    </div>
  );
}
