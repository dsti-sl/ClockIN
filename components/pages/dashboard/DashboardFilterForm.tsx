"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import PeriodFilter, {
  filterFieldClass,
  filterLabelClass,
} from "@/components/ui/PeriodFilter";
import {
  DASHBOARD_STATUS_OPTIONS,
  EMPTY_DASHBOARD_FILTERS,
  dashboardFiltersToQuery,
  type DashboardFilters,
  type DashboardStatusFilter,
} from "@/lib/dashboard-filters";
import { startOfPeriod, type PeriodRange } from "@/lib/period";
import type { AdminOption } from "@/lib/types";

type Props = {
  filters: DashboardFilters;
  /** Resolved period. Null while the overview is shown. */
  range: PeriodRange | null;
  /** Server date (YYYY-MM-DD). */
  today: string;
  /** Admin accounts for the "Created by" filter. Null hides it (non super admins). */
  adminOptions: AdminOption[] | null;
};

export default function DashboardFilterForm({
  filters,
  range,
  today,
  adminOptions,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function apply(next: DashboardFilters) {
    const query = dashboardFiltersToQuery(next);
    startTransition(() => {
      router.push(query ? `/dashboard?${query}` : "/dashboard", {
        scroll: false,
      });
    });
  }

  /** Filters to build on: the current period, or this year when on the overview. */
  function withPeriod(): DashboardFilters {
    return filters.period
      ? filters
      : { ...filters, period: "year", date: startOfPeriod("year", today) };
  }

  return (
    <section aria-label="Dashboard filters" className="card space-y-4 p-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Filters
        </h2>
        {isPending && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        )}
      </div>

      <PeriodFilter
        value={filters}
        // Overview clears every filter, so the original dashboard comes back.
        onChange={(period) =>
          apply(period.period ? { ...filters, ...period } : EMPTY_DASHBOARD_FILTERS)
        }
        allLabel="Overview"
        today={today}
        disabled={isPending}
      />

      {!range && (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Pick Daily, Weekly, Monthly or Yearly to see the numbers for one period.
        </p>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          adminOptions ? "sm:grid-cols-2" : "sm:max-w-xs",
        )}
      >
        <div>
          <label htmlFor="dashboard-filter-status" className={filterLabelClass}>
            Event status
          </label>
          <select
            id="dashboard-filter-status"
            value={filters.status}
            onChange={(e) =>
              apply({
                ...withPeriod(),
                status: e.target.value as DashboardStatusFilter,
              })
            }
            disabled={isPending}
            className={filterFieldClass}
          >
            {DASHBOARD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {adminOptions && (
          <div>
            <label htmlFor="dashboard-filter-admin" className={filterLabelClass}>
              Created by
            </label>
            <select
              id="dashboard-filter-admin"
              value={filters.admin ?? ""}
              onChange={(e) =>
                apply({ ...withPeriod(), admin: e.target.value || null })
              }
              disabled={isPending}
              className={filterFieldClass}
            >
              <option value="">All admins</option>
              {adminOptions.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
