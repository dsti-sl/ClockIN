// lib/dashboard-data.ts
// Server-side queries behind the dashboard period filter. The unfiltered
// overview keeps its original queries in app/(admin)/dashboard/page.tsx.
//
// Within the selected period:
//   • Events / Past Events / Recent events → events whose event_date falls in the period
//   • Active Sessions                      → active sessions of those events
//   • Check-ins and the chart              → attendees whose check-in time (created_at)
//                                            falls in the period, bucketed by hour, day or month
// Status and "created by" filters narrow every number above.
import type { createClient } from "@/lib/supabase/server";
import type { DashboardFilters, DashboardStatusFilter } from "@/lib/dashboard-filters";
import { MONTH_SHORT, addDays, type PeriodRange } from "@/lib/period";
import type { AdminOption, DashboardStats, Event, MonthlyAttendees } from "@/lib/types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type DashboardEvent = Pick<Event, "id" | "name" | "status" | "event_date" | "has_sessions">;

export interface FilteredDashboardData {
  stats:        DashboardStats;
  recentEvents: DashboardEvent[];
  /** Check-ins per hour, day or month across the period. Sums to stats.total_checkins. */
  chart:        MonthlyAttendees[];
}

// PostgREST returns at most 1000 rows per request by default.
const PAGE_SIZE = 1000;
// Event ids per `in.(...)` filter. 100 UUIDs keep each request URL near 4 KB.
const ID_CHUNK_SIZE = 100;
const RECENT_EVENTS_LIMIT = 6;
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// ── Queries ──────────────────────────────────────────────────

interface EventQuery {
  status:       DashboardStatusFilter;
  createdBy:    string | null;
  /** Restricts event_date to [start, endExclusive) when given. */
  range?:       Pick<PeriodRange, "start" | "endExclusive">;
}

/** All matching events, newest first, paged past the 1000-row limit. */
async function fetchEvents(supabase: ServerClient, { status, createdBy, range }: EventQuery): Promise<DashboardEvent[]> {
  const events: DashboardEvent[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase.from("events").select("id,name,status,event_date,has_sessions");
    if (createdBy) query = query.eq("created_by", createdBy);
    if (range) query = query.gte("event_date", range.start).lt("event_date", range.endExclusive);
    // Same status groups as the Events page: ongoing = active, completed = ended + archived.
    if (status === "upcoming") query = query.eq("status", "upcoming");
    if (status === "ongoing") query = query.eq("status", "active");
    if (status === "completed") query = query.in("status", ["ended", "archived"]);

    const { data, error } = await query
      .order("event_date", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("[dashboard] failed to load events:", error.message);
      break;
    }

    events.push(...((data ?? []) as DashboardEvent[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return events;
}

async function countActiveSessions(supabase: ServerClient, eventIds: string[]): Promise<number> {
  const counts = await Promise.all(
    chunk(eventIds, ID_CHUNK_SIZE).map(async (ids) => {
      const { count, error } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .in("event_id", ids)
        .eq("status", "active");
      if (error) console.error("[dashboard] failed to count sessions:", error.message);
      return count ?? 0;
    }),
  );
  return counts.reduce((sum, n) => sum + n, 0);
}

/**
 * Check-in timestamps inside the range. `eventIds` null means every attendee
 * the caller can read; an array limits the result to those events.
 */
async function fetchCheckInTimes(
  supabase: ServerClient,
  range: PeriodRange,
  eventIds: string[] | null,
): Promise<string[]> {
  const startTs = `${range.start}T00:00:00Z`;
  const endTs = `${range.endExclusive}T00:00:00Z`;
  const groups: (string[] | null)[] = eventIds === null ? [null] : chunk(eventIds, ID_CHUNK_SIZE);

  const baseQuery = (ids: string[] | null, head: boolean) => {
    let query = supabase
      .from("attendees")
      .select("created_at", head ? { count: "exact", head: true } : undefined)
      .gte("created_at", startTs)
      .lt("created_at", endTs);
    if (ids) query = query.in("event_id", ids);
    return query;
  };

  const perGroup = await Promise.all(
    groups.map(async (ids) => {
      const { count, error } = await baseQuery(ids, true);
      if (error) {
        console.error("[dashboard] failed to count check-ins:", error.message);
        return [];
      }

      const pages = Math.ceil((count ?? 0) / PAGE_SIZE);
      const results = await Promise.all(
        Array.from({ length: pages }, (_, page) =>
          baseQuery(ids, false)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        ),
      );

      return results.flatMap(({ data, error: pageError }) => {
        if (pageError) console.error("[dashboard] failed to load check-ins:", pageError.message);
        return ((data ?? []) as { created_at: string }[]).map((row) => row.created_at);
      });
    }),
  );

  return perGroup.flat();
}

// ── Chart buckets ────────────────────────────────────────────

interface Bucket {
  key:   string;
  label: string;
}

function buildBuckets(range: PeriodRange): Bucket[] {
  const buckets: Bucket[] = [];

  if (range.granularity === "hour") {
    for (let hour = 0; hour < 24; hour++) {
      const hh = String(hour).padStart(2, "0");
      buckets.push({ key: `${range.start}T${hh}`, label: `${hh}:00` });
    }
    return buckets;
  }

  if (range.granularity === "day") {
    for (let day = range.start; day < range.endExclusive; day = addDays(day, 1)) {
      const dayOfMonth = Number(day.slice(8, 10));
      const month = MONTH_SHORT[Number(day.slice(5, 7)) - 1];
      const weekday = WEEKDAY_SHORT[new Date(`${day}T00:00:00Z`).getUTCDay()];
      const label =
        range.period === "week"  ? `${weekday} ${dayOfMonth}` :
        range.period === "month" ? String(dayOfMonth) :
        `${dayOfMonth} ${month}`;
      buckets.push({ key: day, label });
    }
    return buckets;
  }

  const lastDay = addDays(range.endExclusive, -1);
  const spansYears = range.start.slice(0, 4) !== lastDay.slice(0, 4);
  let year = Number(range.start.slice(0, 4));
  let month = Number(range.start.slice(5, 7));
  const endKey = lastDay.slice(0, 7);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const name = MONTH_SHORT[month - 1];
    buckets.push({ key, label: spansYears ? `${name} ${String(year).slice(2)}` : name });
    if (key >= endKey) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return buckets;
}

/** Bucket key for a check-in timestamp at the given granularity (UTC). */
function bucketKey(timestamp: string, range: PeriodRange): string {
  const iso = new Date(timestamp).toISOString();
  if (range.granularity === "hour") return iso.slice(0, 13);
  if (range.granularity === "day") return iso.slice(0, 10);
  return iso.slice(0, 7);
}

// ── Public API ───────────────────────────────────────────────

/**
 * Dashboard numbers for one period.
 * `createdBy` limits the scope to one admin's events; null means every event
 * the caller can read (super admins).
 */
export async function getFilteredDashboardData(
  supabase: ServerClient,
  filters: DashboardFilters,
  range: PeriodRange,
  createdBy: string | null,
): Promise<FilteredDashboardData> {
  const today = new Date().toISOString().split("T")[0];
  // Check-ins only need an event filter when status or creator narrows the scope.
  const needsEventScope = createdBy !== null || filters.status !== "all";

  const [periodEvents, scopeEvents] = await Promise.all([
    fetchEvents(supabase, { status: filters.status, createdBy, range }),
    needsEventScope
      ? fetchEvents(supabase, { status: filters.status, createdBy })
      : Promise.resolve(null),
  ]);

  const [activeSessions, checkInTimes] = await Promise.all([
    countActiveSessions(supabase, periodEvents.map((e) => e.id)),
    fetchCheckInTimes(supabase, range, scopeEvents ? scopeEvents.map((e) => e.id) : null),
  ]);

  const countByBucket = new Map<string, number>();
  for (const timestamp of checkInTimes) {
    const key = bucketKey(timestamp, range);
    countByBucket.set(key, (countByBucket.get(key) ?? 0) + 1);
  }

  return {
    stats: {
      total_events:    periodEvents.length,
      active_sessions: activeSessions,
      total_checkins:  checkInTimes.length,
      past_events:     periodEvents.filter((e) => e.status === "archived" || e.event_date < today).length,
    },
    recentEvents: periodEvents.slice(0, RECENT_EVENTS_LIMIT),
    chart: buildBuckets(range).map(({ key, label }) => ({
      month: label,
      count: countByBucket.get(key) ?? 0,
    })),
  };
}

/** Admin accounts for the super-admin "Created by" filter, sorted by display name. */
export async function getAdminOptions(supabase: ServerClient): Promise<AdminOption[]> {
  const { data, error } = await supabase.from("profiles").select("id, full_name, email");

  if (error) {
    console.error("[dashboard] failed to load admin options:", error.message);
    return [];
  }

  return (data ?? [])
    .map((p: { id: string; full_name: string | null; email: string | null }) => ({
      id:   p.id,
      name: p.full_name?.trim() || p.email || "Unnamed admin",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
