"use client";

import { useMemo, useState } from "react";
import type { Vessel } from "@/lib/types";

type SortKey = "name" | "buildYear" | "coiExpirationDate";
type StatusFilter = "all" | "expired" | "upcoming" | "no_record";

function coiStatus(v: Vessel, now: Date): StatusFilter {
  if (!v.coiExpirationDate) return "no_record";
  const exp = new Date(v.coiExpirationDate);
  if (Number.isNaN(exp.getTime())) return "no_record";
  return exp < now ? "expired" : "upcoming";
}

export default function VesselTable({ vessels, now }: { vessels: Vessel[]; now: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("coiExpirationDate");
  const [sortAsc, setSortAsc] = useState(true);

  const nowDate = useMemo(() => new Date(now), [now]);

  const filtered = useMemo(() => {
    let rows = vessels;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((v) => v.name.toLowerCase().includes(q) || v.id.includes(q));
    }
    if (statusFilter !== "all") {
      rows = rows.filter((v) => coiStatus(v, nowDate) === statusFilter);
    }
    return rows;
  }, [vessels, search, statusFilter, nowDate]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "buildYear") cmp = (a.buildYear ?? 0) - (b.buildYear ?? 0);
      else {
        const aTime = a.coiExpirationDate ? new Date(a.coiExpirationDate).getTime() : Infinity;
        const bTime = b.coiExpirationDate ? new Date(b.coiExpirationDate).getTime() : Infinity;
        cmp = aTime - bTime;
      }
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const headerCell = (key: SortKey, label: string) => (
    <th
      className="cursor-pointer select-none px-3 py-2 text-left font-medium text-slate-300 hover:text-slate-100"
      onClick={() => toggleSort(key)}
    >
      {label}
      {sortKey === key ? (sortAsc ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by vessel name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="expired">Expired</option>
          <option value="upcoming">Upcoming expiration</option>
          <option value="no_record">No COI on record</option>
        </select>
        <span className="text-xs text-slate-400">{sorted.length.toLocaleString()} vessels</span>
      </div>

      <div className="max-h-[600px] overflow-auto rounded-lg border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="sticky top-0 bg-slate-800">
            <tr>
              {headerCell("name", "Vessel Name")}
              <th className="px-3 py-2 text-left font-medium text-slate-300">ID</th>
              {headerCell("buildYear", "Build Year")}
              <th className="px-3 py-2 text-left font-medium text-slate-300">COI Issued</th>
              {headerCell("coiExpirationDate", "COI Expires")}
              <th className="px-3 py-2 text-left font-medium text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {sorted.slice(0, 500).map((v) => {
              const status = coiStatus(v, nowDate);
              return (
                <tr key={v.id}>
                  <td className="px-3 py-1.5 text-slate-100">{v.name}</td>
                  <td className="px-3 py-1.5 text-slate-400">{v.id}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-300">{v.buildYear ?? "—"}</td>
                  <td className="px-3 py-1.5 text-slate-300">{v.coiIssueDate ?? "—"}</td>
                  <td className="px-3 py-1.5 text-slate-300">{v.coiExpirationDate ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "expired"
                          ? "bg-red-500/15 text-red-300"
                          : status === "no_record"
                          ? "bg-slate-800 text-slate-300"
                          : "bg-emerald-500/15 text-emerald-300"
                      }`}
                    >
                      {status === "expired" ? "Expired" : status === "no_record" ? "No record" : "Upcoming"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length > 500 && (
          <p className="border-t border-slate-800 px-3 py-2 text-xs text-slate-400">
            Showing the first 500 of {sorted.length.toLocaleString()} matching vessels. Narrow your search or filter to see others.
          </p>
        )}
      </div>
    </div>
  );
}
