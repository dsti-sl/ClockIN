"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Calendar, Radio, Search } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export type EventRow = {
  id: string;
  name: string;
  location: string;
  event_date: string;
  archived_at: string | null;
  status: string;
  creator?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export type SessionRow = {
  id: string;
  name: string;
  event_id: string;
  archived_at: string | null;
  status: string;
  event: {
    id: string;
    name: string;
  } | null;
};

export type Filter =
  | "all"
  | "events"
  | "sessions"
  | "upcoming"
  | "ongoing"
  | "completed";

type Props = {
  events: EventRow[];
  sessions: SessionRow[];
  isSuperAdmin: boolean;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "events", label: "Events" },
  { value: "sessions", label: "Sessions" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

export default function EventsList({ events, sessions, isSuperAdmin }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const eventItems = events.map((event) => ({
      type: "event" as const,
      id: event.id,
      title: event.name,
      subtitle: event.location,
      date: event.event_date,
      status: event.status,
      href: `/events/${event.id}`,
      creator: isSuperAdmin
        ? event.creator?.full_name || event.creator?.email
        : null,
    }));

    const sessionItems = sessions.map((session) => ({
      type: "session" as const,
      id: session.id,
      title: session.name,
      subtitle: session.event?.name ?? "Unknown event",
      date: null,
      status: session.status,
      href: `/events/${session.event_id}/sessions/${session.id}`,
      creator: null,
    }));

    return [...eventItems, ...sessionItems]
      .filter((item) => {
        switch (filter) {
          case "events":
            return item.type === "event";
          case "sessions":
            return item.type === "session";
          case "upcoming":
            return item.status === "upcoming" || item.status === "pending";
          case "ongoing":
            return item.status === "active";
          case "completed":
            return item.status === "ended" || item.status === "archived";
          default:
            return true;
        }
      })
      .filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      );
  }, [events, sessions, filter, search, isSuperAdmin]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium transition",
                filter === value
                  ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            className="
              absolute left-3 top-1/2
              h-4 w-4 -translate-y-1/2
              text-gray-400
            "
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events and sessions..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex min-w-0 gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  item.type === "event"
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300"
                      : "bg-green-50 text-green-600 dark:bg-green-900/25 dark:text-green-300",
                )}
              >
                {item.type === "event" ? (
                  <Calendar className="h-5 w-5" />
                ) : (
                  <Radio className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="
                      truncate text-sm font-semibold text-gray-900 dark:text-slate-100
                    "
                  >
                    {item.title}
                  </p>

                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      item.status === "archived" || item.status === "ended"
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900/25 dark:text-purple-300"
                        : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-200",
                    )}
                  >
                    {item.status === "archived" || item.status === "ended"
                      ? "completed"
                      : item.status}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-400">{item.subtitle}</p>

                {item.date && (
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(item.date)}
                  </p>
                )}

                {item.creator && (
                  <p className="mt-1 text-xs text-indigo-500 dark:text-indigo-300">{item.creator}</p>
                )}
              </div>
            </div>

            <Link
              href={item.href}
              className="ml-3 flex shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/60"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
            </Link>
          </div>
        ))}

        {items.length === 0 && (
          <div
            className="rounded-2xl border bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-sm text-gray-500">
              No events or sessions found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
