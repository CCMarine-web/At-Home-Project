# US Inland & Coastal Fleet Dashboard

An executive dashboard covering the US inland/coastal tank barge, hopper barge, towboat, and tugboat
fleet, built on data pulled from the US Coast Guard's PSIX vessel database. See the **Data Sources** tab
in the app itself for what each number does and doesn't mean.

## Refreshing the data (no coding required)

1. Go to this repository on github.com.
2. Click the **Actions** tab near the top.
3. Click **Refresh fleet data** in the list on the left.
4. Click the **Run workflow** button, then **Run workflow** again to confirm.
5. Wait — a full refresh takes roughly 60-90 minutes (it pulls tens of thousands of records — vessel
   summaries, Certificates of Inspection for tank barges *and* towing vessels, plus cargo sub-types and
   hull dimensions for the in-service tank fleet — from a small government server at a deliberately
   gentle pace, so it isn't instant). You can watch its progress by clicking into the running job.
6. When it finishes, it automatically commits the new data and Vercel redeploys the site with it —
   nothing else to do. The "last pulled" timestamp on every tab will reflect the new run.

It also runs automatically every Monday morning, since that's roughly how often the underlying USCG data
itself changes.

## Getting to the site

The site is password-protected (see below) — ask whoever manages the Vercel project for the current
password if you don't have it.

## Local development (for whoever maintains this)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To pull fresh data locally instead of waiting on GitHub Actions:

```bash
npm run refresh-data
```

Add `-- --limit 20` to that command to do a fast, small test pull instead of the full ~65,000-vessel run.

## Manual (non-automated) data files

Two small JSON files hold figures that cannot be pulled automatically because their sources block
automated tools. Each documents exactly how to update it:

- `data/wcsc-fleet.json` — USACE WTLUS annual in-service counts (hopper barges, deck barges + size
  ranges, towboat horsepower classes). Update once a year from the WCSC portal in a normal browser;
  several charts on the Hopper Barges, Deck Barges, Towboats and Tugboats tabs stay in an
  "awaiting WTLUS" state until these are filled in.
- `data/market-reference.json` — sourced benchmark figures (BTS Table 1-34 fleet totals, Waterways
  Journal benchmarks, trade-press operator fleet sizes) with their citations and retrieval dates.

## Password protection

Set an environment variable named `SITE_PASSWORD` in the Vercel project's settings (Settings → Environment
Variables). Any username works at the login prompt — only the password is checked. Without that
environment variable set, the site is open to anyone with the URL, so make sure it's set before sharing
the link outside the team.

## Deploying

This project deploys to [Vercel](https://vercel.com). Connect this GitHub repository to a Vercel project
(Vercel → Add New → Project → import this repo) and it will build and deploy automatically on every push
to `main` — including the automated data-refresh commits described above.
