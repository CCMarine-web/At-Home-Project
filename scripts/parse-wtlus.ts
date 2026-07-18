/**
 * Parses the USACE WCSC "Vessel Characteristics" Excel files (the per-vessel
 * WTLUS data) into data/wcsc-fleet.json.
 *
 * Yearly update procedure (no coding required beyond running this):
 *  1. In a normal browser, open the WCSC Vessel Characteristics page (the
 *     portal 403s automated tools):
 *     https://www.iwr.usace.army.mil/About/Technical-Centers/WCSC-Waterborne-Commerce-Statistics-Center/WCSC-Vessel-Characteristics/
 *  2. Download the newest year's per-type Excel files (deck barges, dry
 *     covered barge, dry open barge, other dry barges, tank barges, towboats,
 *     and the TS<yy>OP operator file) into one folder.
 *  3. Run: npx tsx scripts/parse-wtlus.ts --dir "<that folder>" --year <year>
 *  4. Commit the updated data/wcsc-fleet.json and push.
 *
 * File identification is by filename keyword (deck / drycv / dryop / otdbrg /
 * tankb / towb / ts<yy>op), matching WCSC's own naming convention.
 */
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const HP_UNKNOWN_SENTINEL = 99999;

function arg(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

interface VesselRow {
  name: string;
  hp: number | null;
  lengthFeet: number | null;
  yearBuilt: number | null;
  operatorId: string;
}

function readVesselFile(filePath: string): VesselRow[] {
  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const headers = (rows[0] as unknown[]).map((h) => String(h).trim());
  const col = (n: string) => headers.indexOf(n);
  const iName = col("VS_NAME");
  const iNum = col("VS_NUMBER");
  const iHp = col("HP");
  const iLen = col("OVER_LNGTH");
  const iYear = col("YEAR_VESSEL");
  const iOper = col("TS_OPER");
  if ([iName, iHp, iLen, iYear, iOper].some((i) => i === -1)) {
    throw new Error(`${path.basename(filePath)}: unexpected header layout: ${headers.join(",")}`);
  }
  const out: VesselRow[] = [];
  for (const raw of rows.slice(1)) {
    const r = raw as unknown[];
    if (r.length === 0 || r[iName] === undefined) continue;
    const hp = Number(r[iHp]);
    const len = Number(r[iLen]);
    const yr = Number(r[iYear]);
    const num = r[iNum] !== undefined && r[iNum] !== null ? ` ${r[iNum]}` : "";
    out.push({
      name: `${String(r[iName]).trim()}${num}`.trim(),
      hp: Number.isFinite(hp) && hp > 0 && hp !== HP_UNKNOWN_SENTINEL ? hp : null,
      lengthFeet: Number.isFinite(len) && len > 0 ? len : null,
      yearBuilt: Number.isFinite(yr) && yr > 1800 ? yr : null,
      operatorId: String(r[iOper] ?? ""),
    });
  }
  return out;
}

function readOperators(filePath: string): Map<string, string> {
  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const headers = (rows[0] as unknown[]).map((h) => String(h).trim());
  const iId = headers.indexOf("TS_OPER");
  const iName = headers.indexOf("NAME");
  const map = new Map<string, string>();
  for (const raw of rows.slice(1)) {
    const r = raw as unknown[];
    if (r[iId] === undefined) continue;
    map.set(String(r[iId]), String(r[iName] ?? "").trim());
  }
  return map;
}

function bucketize(values: number[], defs: Array<{ label: string; min: number; max: number }>) {
  return defs
    .map((d) => ({ label: d.label, count: values.filter((v) => v >= d.min && v < d.max).length }))
    .filter((b) => b.count > 0);
}

function topOperators(vessels: VesselRow[], operators: Map<string, string>, top: number) {
  const counts = new Map<string, number>();
  for (const v of vessels) {
    if (!v.operatorId) continue;
    counts.set(v.operatorId, (counts.get(v.operatorId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([id, count]) => ({ name: operators.get(id) ?? `Operator ${id}`, count }));
}

function main() {
  const dir = arg("dir");
  const year = Number(arg("year"));
  if (!dir || !Number.isFinite(year)) {
    console.error('Usage: npx tsx scripts/parse-wtlus.ts --dir "<folder with WCSC xlsx files>" --year <year>');
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".xlsx"));
  const find = (kw: RegExp): string => {
    const hit = files.find((f) => kw.test(f.toLowerCase()));
    if (!hit) throw new Error(`No file matching ${kw} in ${dir}. Files: ${files.join(", ")}`);
    return path.join(dir, hit);
  };

  console.log("Reading WCSC vessel characteristics files...");
  const deck = readVesselFile(find(/deck/));
  const dryCovered = readVesselFile(find(/drycv/));
  const dryOpen = readVesselFile(find(/dryop/));
  const otherDry = readVesselFile(find(/otdbrg/));
  const tank = readVesselFile(find(/tankb/));
  const towboats = readVesselFile(find(/towb/));
  const operators = readOperators(find(/ts\d+op/));

  const hoppers = [...dryCovered, ...dryOpen];
  const allDry = [...hoppers, ...deck, ...otherDry];

  const towboatHp = towboats.map((t) => t.hp).filter((h): h is number => h !== null);
  const hpClasses = bucketize(towboatHp, [
    { label: "< 800 hp", min: 0, max: 800 },
    { label: "800-1,199 hp", min: 800, max: 1200 },
    { label: "1,200-1,999 hp", min: 1200, max: 2000 },
    { label: "2,000-3,199 hp", min: 2000, max: 3200 },
    { label: "3,200-4,999 hp", min: 3200, max: 5000 },
    { label: "5,000+ hp", min: 5000, max: Infinity },
  ]);

  const deckLengths = deck.map((d) => d.lengthFeet).filter((l): l is number => l !== null);
  const sizeRanges = bucketize(deckLengths, [
    { label: "< 100 ft", min: 0, max: 100 },
    { label: "100-149 ft", min: 100, max: 150 },
    { label: "150-199 ft", min: 150, max: 200 },
    { label: "200-249 ft", min: 200, max: 250 },
    { label: "250+ ft", min: 250, max: Infinity },
  ]);

  const output = {
    source:
      "USACE Waterborne Commerce Statistics Center — WTLUS / Vessel Characteristics per-vessel Excel files",
    sourceUrl:
      "https://www.iwr.usace.army.mil/About/Technical-Centers/WCSC-Waterborne-Commerce-Statistics-Center/WCSC-Vessel-Characteristics/",
    retrievalMethod:
      "Downloaded manually in a browser (the portal 403s automated tools), then parsed with scripts/parse-wtlus.ts. See that script's header for the yearly procedure.",
    dataYear: year,
    retrievedAt: new Date().toISOString().slice(0, 10),
    sourceFiles: files,
    howToUpdate: [
      "Download the newest year's per-type Excel files from sourceUrl in a normal browser,",
      'then run: npx tsx scripts/parse-wtlus.ts --dir "<downloads folder>" --year <year>',
      "and commit the regenerated data/wcsc-fleet.json.",
    ],
    counts: {
      dryCargoBarge: allDry.length,
      hopperBarge: hoppers.length,
      deckBarge: deck.length,
      otherDryBarge: otherDry.length,
      tankBarge: tank.length,
      towboatTugboat: towboats.length,
    },
    deckBargeSizeRanges: sizeRanges,
    towboatHpClasses: hpClasses,
    towboatHpUnknown: towboats.length - towboatHp.length,
    topOperators: {
      deckBarge: topOperators(deck, operators, 15),
      hopperBarge: topOperators(hoppers, operators, 15),
      tankBarge: topOperators(tank, operators, 15),
      towboatTugboat: topOperators(towboats, operators, 15),
    },
  };

  const outPath = path.join(process.cwd(), "data", "wcsc-fleet.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Wrote ${outPath}`);
  console.log("Counts:", output.counts);
  console.log("Towboat HP known/unknown:", towboatHp.length, "/", output.towboatHpUnknown);
  console.log("Top hopper operators:", output.topOperators.hopperBarge.slice(0, 5));
  console.log("Top tank operators:", output.topOperators.tankBarge.slice(0, 5));
}

main();
