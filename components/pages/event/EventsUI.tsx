"use client";

import Link from "next/link";
import { Plus, FolderOpen } from "lucide-react";
import EventsList, { type EventRow, type SessionRow } from "./EventsList";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface EventsUIProps {
  events: EventRow[];
  sessions: SessionRow[];
  isSuperAdmin: boolean;
}

export default function EventsUI({ events, sessions, isSuperAdmin }: EventsUIProps) {
  const total = events.length + sessions.length;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Events</h1>

          <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
            {isSuperAdmin ? "Showing all events and sessions" : "Manage your events"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/events/new"
            className="
              btn-primary
              flex items-center gap-1.5
            "
          >
            <Plus className="h-4 w-4" />
            New event
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total" value={total} valueClass="text-gray-900 dark:text-slate-100" />
        <SummaryCard label="Events" value={events.length} valueClass="text-indigo-600 dark:text-indigo-300" />
        <SummaryCard label="Sessions" value={sessions.length} valueClass="text-green-600 dark:text-green-300" />
      </div>

      {/* Content */}
      {total > 0 ? (
        <EventsList
          events={events}
          sessions={sessions}
          isSuperAdmin={isSuperAdmin}
        />
      ) : (
        <div className="flex flex-col items-center rounded-2xl border bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-800">
          <div
            className="
              flex h-14 w-14
              items-center justify-center
              rounded-2xl bg-gray-100
            "
          >
            <FolderOpen className="h-7 w-7 text-gray-400" />
          </div>

          <h3 className="mt-4 font-semibold text-gray-700">No events yet</h3>

          <p className="mt-1 text-sm text-gray-400">
            Create your first event to get started.
          </p>

          <Link href="/events/new" className="btn-primary mt-5">
            Create event
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400">{label}</p>

      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
