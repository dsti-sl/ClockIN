// lib/dashboard-filters.ts
// Dashboard filter parsing and URL serialisation. Shared by the dashboard
// page (server) and its filter form (client), so it must stay free of
// server-only imports. Period maths lives in lib/period.ts.
import {
  PERIOD_OPTIONS,
  parseDay,
  startOfPeriod,
  type Period,
  type PeriodSelection,
} from "@/lib/period";

export type DashboardStatusFilter = "all" | "upcoming" | "ongoing" | "completed";

export const DASHBOARD_STATUS_OPTIONS: { value: DashboardStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "upcoming",  label: "Upcoming" },
  { value: "ongoing",   label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

export interface DashboardFilters extends PeriodSelection {
  status: DashboardStatusFilter;
  /** Event creator's profile id. Only honoured for super admins. */
  admin:  string | null;
}

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  period: null,
  date:   null,
  from:   null,
  to:     null,
  status: "all",
  admin:  null,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPeriod(value: string | undefined): value is Period {
  return PERIOD_OPTIONS.some((option) => option.value === value);
}

function isStatusFilter(value: string | undefined): value is DashboardStatusFilter {
  return DASHBOARD_STATUS_OPTIONS.some((option) => option.value === value);
}

/**
 * Turns untrusted URL search params into a valid filter set.
 * Invalid values are dropped. A status or admin filter without a period
 * falls back to the year containing `today`.
 */
export function parseDashboardFilters(params: RawSearchParams, today: string): DashboardFilters {
  const rawStatus = firstValue(params.status);
  const rawAdmin = firstValue(params.admin);
  const status: DashboardStatusFilter = isStatusFilter(rawStatus) ? rawStatus : "all";
  const admin = rawAdmin && UUID_RE.test(rawAdmin) ? rawAdmin : null;

  let from = parseDay(firstValue(params.from));
  let to = parseDay(firstValue(params.to));

  const rawPeriod = firstValue(params.period);
  let period: Period | null = isPeriod(rawPeriod) ? rawPeriod : null;
  if (!period && (from || to)) period = "custom";
  if (!period && (status !== "all" || admin)) period = "year";
  if (!period) return EMPTY_DASHBOARD_FILTERS;

  if (period === "custom") {
    from = from ?? to ?? today;
    to = to ?? from;
    if (from > to) [from, to] = [to, from];
    return { period, date: null, from, to, status, admin };
  }

  const date = startOfPeriod(period, parseDay(firstValue(params.date)) ?? today);
  return { period, date, from: null, to: null, status, admin };
}

/** Serialises filters to a query string, omitting defaults so URLs stay short. */
export function dashboardFiltersToQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  if (!filters.period) return "";
  params.set("period", filters.period);
  if (filters.period === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  } else if (filters.date) {
    params.set("date", filters.date);
  }
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.admin) params.set("admin", filters.admin);
  return params.toString();
}
