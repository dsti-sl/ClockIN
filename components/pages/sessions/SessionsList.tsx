"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio, Search } from "lucide-react";

import ListFilters from "@/components/ui/ListFilters";
import { formatDate, statusLabel } from "@/lib/utils";
import {
  NO_PERIOD,
  isDayInRange,
  resolvePeriodRange,
  type PeriodSelection,
} from "@/lib/period";
import type { Session } from "@/lib/types";

export type SessionListItem = Session & {
  event: { id: string; name: string; event_date: string } | null;
};

/** Sessions grouped by status, with search and an event-date period filter. */
export default function SessionsList({ sessions }: { sessions: SessionListItem[] }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodSelection>(NO_PERIOD);

  const range = resolvePeriodRange(period);
  const q = search.trim().toLowerCase();

  const filtered = sessions.filter((s) => {
    if (!isDayInRange(s.event?.event_date, range)) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.event?.name ?? "").toLowerCase().includes(q)
    );
  });

  const active  = filtered.filter((s) => s.status === "active");
  const pending = filtered.filter((s) => s.status === "pending");
  const ended   = filtered.filter((s) => s.status === "ended");

  return (
    <div className="space-y-6">
      <div className="card space-y-1 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by session or event name…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
        <div className="pt-2">
          <ListFilters
            period={period}
            onPeriodChange={setPeriod}
            dateLabel="Event date"
          />
        </div>
        {(q || range) && (
          <p className="pt-1 text-xs text-gray-400 dark:text-slate-400">
            {filtered.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="card px-5 py-10 text-center text-sm text-gray-400 dark:text-slate-400">
          No sessions match your search or filters.
        </div>
      )}

      {active.length > 0 && (
        <SessionGroup
          title="Live now"
          sessions={active}
          accent="text-green-600 bg-green-50"
          icon={<Radio className="h-3.5 w-3.5 animate-pulse" />}
        />
      )}

      {pending.length > 0 && (
        <SessionGroup title="Upcoming" sessions={pending} accent="text-amber-600 bg-amber-50" />
      )}

      {ended.length > 0 && (
        <SessionGroup title="Ended" sessions={ended} accent="text-gray-500 bg-gray-100" />
      )}
    </div>
  );
}

function SessionGroup({
  title,
  sessions,
  accent,
  icon,
}: {
  title: string;
  sessions: SessionListItem[];
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {icon && <span className={`rounded-full p-1 ${accent}`}>{icon}</span>}
      </div>
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/events/${s.event_id}/sessions/${s.id}`}
              prefetch={false}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">
                  {s.event?.name ?? "Unknown event"}
                  {s.event?.event_date ? ` · ${formatDate(s.event.event_date)}` : ""}
                </p>
              </div>
              <span className={`badge-${s.status} flex-shrink-0`}>{statusLabel(s.status)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
