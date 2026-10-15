"use client";

import Link from "next/link";
import {
  Calendar,
  Radio,
  CheckCircle2,
  Archive,
  Plus,
  ChevronRight,
} from "lucide-react";

import MonthlyAttendeesChart from "@/components/analytics/MonthlyAttendeesChart";
import DashboardFilterForm from "@/components/pages/dashboard/DashboardFilterForm";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { cn, formatDate, statusLabel } from "@/lib/utils";
import {
  dashboardFiltersToQuery,
  type DashboardFilters,
} from "@/lib/dashboard-filters";
import type { PeriodRange } from "@/lib/period";
import type {
  AdminOption,
  DashboardStats,
  Event,
  MonthlyAttendees,
} from "@/lib/types";

type RecentEvent = Pick<
  Event,
  "id" | "name" | "status" | "event_date" | "has_sessions"
>;

type Props = {
  stats: DashboardStats;
  pastEvents: number;
  recentEvents: RecentEvent[] | null;
  isSuperAdmin: boolean;
  filters: DashboardFilters;
  /** Selected period. Null shows the default overview. */
  range: PeriodRange | null;
  /** Server date (YYYY-MM-DD), so server and browser agree on "today". */
  today: string;
  adminOptions: AdminOption[] | null;
  /** Chart points for the selected period. Null keeps the default yearly chart. */
  chart: MonthlyAttendees[] | null;
};

const CHART_TITLES = {
  hour: "Check-ins per hour",
  day: "Check-ins per day",
  month: "Check-ins per month",
} as const;

export default function DashboardUI({
  stats,
  pastEvents,
  recentEvents,
  isSuperAdmin,
  filters,
  range,
  today,
  adminOptions,
  chart,
}: Props) {
  const isFiltered = range !== null;
  // Remounts the form and chart when the URL filters change (e.g. browser back).
  const filterKey = dashboardFiltersToQuery(filters);

  const statCards = [
    {
      label: isFiltered ? "Events" : "Total Daily Events",
      value: stats.total_events,
      icon: Calendar,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Sessions",
      value: stats.active_sessions,
      icon: Radio,
      color: "text-green-600 bg-green-50",
    },
    {
      label: isFiltered ? "Check-ins" : "Total Daily Attendees",
      value: stats.total_checkins,
      icon: CheckCircle2,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: isFiltered ? "Past Events" : "Total Past Events",
      value: pastEvents,
      icon: Archive,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

          <p className="mt-0.5 text-sm text-gray-500">
            {isSuperAdmin ? "Welcome!" : "Overview of your events for today"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/events/new"
            className="
            btn-primary flex items-center gap-1.5
            "
          >
            <Plus className="h-4 w-4" />
            New event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div
        className="
        grid grid-cols-2 gap-3
        lg:grid-cols-4
      "
      >
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div
              className="
                flex items-start justify-between
              "
            >
              <div>
                <p
                  className="
                    text-xs font-medium
                    uppercase tracking-wide
                    text-gray-500 dark:text-white
                  "
                >
                  {label}
                </p>

                <p
                  className="
                    mt-1.5 text-3xl
                    font-semibold text-gray-900 dark:text-white
                  "
                >
                  {value}
                </p>
              </div>

              <div
                className={`
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  ${color}
                  `}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <DashboardFilterForm
        key={`filters-${filterKey}`}
        filters={filters}
        range={range}
        today={today}
        adminOptions={adminOptions}
      />

      {/* Chart */}
      {range && chart ? (
        <MonthlyAttendeesChart
          key={`chart-${filterKey}`}
          data={chart}
          title={CHART_TITLES[range.granularity]}
          periodLabel={range.label}
        />
      ) : (
        <MonthlyAttendeesChart />
      )}

      {/* Recent Events */}
      {recentEvents && (
        <div
          className="
          card overflow-hidden
        "
        >
          <div
            className="
            flex items-center justify-between
            border-b border-gray-100
            px-5 py-3
          "
          >
            <h2
              className="
              font-semibold text-gray-900
            "
            >
              {isFiltered ? "Matching events" : "Recent events"}
              {isFiltered && stats.total_events > recentEvents.length && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-400">
                  latest {recentEvents.length} of {stats.total_events}
                </span>
              )}
            </h2>

            <Link
              href="/events"
              className="
              text-xs font-medium
              text-indigo-600
              hover:text-indigo-700
              "
            >
              View all →
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <p
              className="
              px-5 py-8 text-sm text-gray-400
            "
            >
              {isFiltered ? "No events match these filters." : "No events yet."}
            </p>
          ) : (
            <div
              className="
              space-y-3 p-5
            "
            >
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  prefetch={false}
                  className="
                    group flex items-center justify-between
                    gap-3 rounded-xl border
                    border-gray-100 bg-white p-3
                    shadow-sm transition
                    hover:border-indigo-100 hover:shadow-md
                    dark:border-slate-700 dark:bg-slate-800
                    dark:hover:border-slate-600
                    "
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="
                        flex h-10 w-10 shrink-0
                        items-center justify-center rounded-xl
                        bg-indigo-50 text-indigo-600
                        dark:bg-indigo-950/30 dark:text-indigo-300
                      "
                    >
                      <Calendar className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          truncate text-sm font-semibold
                          text-gray-900 dark:text-slate-100
                        "
                      >
                        {event.name}
                      </p>

                      <p
                        className="
                          mt-0.5 text-xs text-gray-400
                          dark:text-slate-400
                        "
                      >
                        {formatDate(event.event_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        event.status === "active" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                        event.status === "upcoming" &&
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                        (event.status === "ended" ||
                          event.status === "archived") &&
                          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                      )}
                    >
                      {statusLabel(event.status)}
                    </span>

                    <ChevronRight
                      className="
                        h-4 w-4 text-gray-300 transition
                        group-hover:translate-x-0.5 group-hover:text-indigo-500
                        dark:text-slate-600
                      "
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
