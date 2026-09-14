"use client";

import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowUpRight,
  Timer,
} from "lucide-react";
import type { Event } from "@/lib/types";
import { formatDate, formatTime, timeAgo } from "@/lib/function";

type EventWithSessions = Event & {
  sessions: {
    count: number;
  }[];
};

interface EventCardProps {
  event: EventWithSessions;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={
        `group block rounded-2xl border p-5 transition-all hover:border-indigo-200 hover:shadow-sm
         border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800`
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl
              bg-indigo-50 dark:bg-indigo-950/30
            "
          >
            <Calendar className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="min-w-0">
            <h2
              className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300"
            >
              {event.name}
            </h2>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-400">
              Created {timeAgo(event.created_at)}
            </p>
          </div>
        </div>

        <span
          className={`
            badge-${event.status}
            shrink-0
            rounded-full
            px-3 py-1
            text-[11px]
            font-medium
          `}
        >
          {event.status}
        </span>
      </div>

      {/* Information Row */}
      <div
        className="
    mt-5
    grid
    grid-cols-3
    divide-x
    divide-gray-100
    rounded-xl
    border
    border-gray-100
    bg-gray-50/60
    dark:divide-slate-700
    dark:border-slate-700
    dark:bg-slate-900/40
    py-3
  "
      >
        {/* Location */}
        <div className="flex min-w-0 items-center gap-2 px-3">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-400">
              Location
            </p>

            <p
              className="truncate text-xs font-medium text-gray-700 dark:text-slate-200"
            >
              {event.location}
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="flex min-w-0 items-center gap-2 px-3">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-400" />

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400">
              Date
            </p>

            <p
              className="truncate text-xs font-medium text-gray-700 dark:text-slate-200"
            >
              {formatDate(event.event_date)}
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="flex min-w-0 items-center gap-2 px-3">
          <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-400" />

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400">
              Time
            </p>

            <p
              className="truncate text-xs font-medium text-gray-700 dark:text-slate-200"
            >
              {formatTime(event.start_time)}
              {" - "}
              {formatTime(event.end_time)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="
          mt-4
          flex
          items-center
          justify-between
        "
      >
        {event.has_sessions ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
            {event.sessions?.[0]?.count ?? 0} session(s)
          </div>
        ) : (
          <div
            className="
              flex
              items-center
              gap-2
              text-xs
              text-gray-400
            "
          >
            <Timer className="h-3.5 w-3.5" />
            Event
          </div>
        )}

          <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition-colors group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-300">
          Open
          <ArrowUpRight
            className="
              h-3.5 w-3.5
              transition-transform
              group-hover:translate-x-0.5
              group-hover:-translate-y-0.5
            "
          />
        </div>
      </div>
    </Link>
  );
}
