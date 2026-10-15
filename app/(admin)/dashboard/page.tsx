// app/(admin)/dashboard/page.tsx
import { createClient, getProfile } from "@/lib/supabase/server";
import type { AdminOption, DashboardStats, Event, MonthlyAttendees } from "@/lib/types";
import DashboardUI from "@/components/pages/dashboard/DashboardUI";
import { parseDashboardFilters } from "@/lib/dashboard-filters";
import { resolvePeriodRange } from "@/lib/period";
import { getAdminOptions, getFilteredDashboardData } from "@/lib/dashboard-data";

export const revalidate = 30;

const empty = { count: 0 } as const;

type RecentEvent = Pick<
  Event,
  "id" | "name" | "status" | "event_date" | "has_sessions"
>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getProfile();

  if (!profile) {
    return null;
  }

  const supabase = await createClient();
  const userId = profile.id;
  const isSuperAdmin = profile.is_super_admin ?? false;

  const today = new Date().toISOString().split("T")[0];

  const requestedFilters = parseDashboardFilters(await searchParams, today);
  // Only super admins can look at another admin's events.
  const filters = isSuperAdmin ? requestedFilters : { ...requestedFilters, admin: null };
  const range = resolvePeriodRange(filters);

  // Started now so it runs alongside the stats queries below.
  const adminOptionsPromise: Promise<AdminOption[] | null> = isSuperAdmin
    ? getAdminOptions(supabase)
    : Promise.resolve(null);

  let stats: DashboardStats;
  let pastEvents = 0;
  let recentEvents: RecentEvent[] | null = null;
  let chart: MonthlyAttendees[] | null = null;

  if (range) {
    const filtered = await getFilteredDashboardData(
      supabase,
      filters,
      range,
      isSuperAdmin ? filters.admin : userId,
    );
    stats = filtered.stats;
    pastEvents = filtered.stats.past_events;
    recentEvents = filtered.recentEvents;
    chart = filtered.chart;
  } else if (isSuperAdmin) {
    const [{ data: statsRow }, { data: events }, { count: past }] =
      await Promise.all([
        supabase.from("dashboard_stats").select("*").single(),
        supabase
          .from("events")
          .select("id,name,status,event_date,has_sessions")
          .order("event_date", { ascending: false })
          .limit(6),
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .or(`status.eq.archived,event_date.lt.${today}`),
      ]);
    stats = {
      ...(statsRow ?? {
        total_events: 0,
        active_sessions: 0,
        total_checkins: 0,
        past_events: 0,
      }),
      past_events: past ?? 0,
    };
    pastEvents = past ?? 0;
    recentEvents = events as RecentEvent[] | null;
  } else {
    const { data: myEvents } = await supabase
      .from("events")
      .select("id")
      .eq("created_by", userId);

    const eventIds = (myEvents ?? []).map((e: { id: string }) => e.id);

    const [
      { count: totalEvents },
      { count: activeSessions },
      { count: totalCheckins },
      { count: past },
      { data: events },
    ] = await Promise.all([
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId)
        .neq("status", "archived"),
      eventIds.length
        ? supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .in("event_id", eventIds)
            .eq("status", "active")
        : Promise.resolve(empty),
      eventIds.length
        ? supabase
            .from("attendance_records")
            .select("*", { count: "exact", head: true })
            .in("event_id", eventIds)
        : Promise.resolve(empty),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId)
        .or(`status.eq.archived,event_date.lt.${today}`),
      supabase
        .from("events")
        .select("id,name,status,event_date,has_sessions")
        .eq("created_by", userId)
        .order("event_date", { ascending: false })
        .limit(6),
    ]);

    stats = {
      total_events: totalEvents ?? 0,
      active_sessions: activeSessions ?? 0,
      total_checkins: totalCheckins ?? 0,
      past_events: past ?? 0,
    };
    pastEvents = past ?? 0;
    recentEvents = events as RecentEvent[] | null;
  }

  const adminOptions = await adminOptionsPromise;

  return (
    <DashboardUI
      stats={stats}
      pastEvents={pastEvents}
      recentEvents={recentEvents}
      isSuperAdmin={isSuperAdmin}
      filters={filters}
      range={range}
      today={today}
      adminOptions={adminOptions}
      chart={chart}
    />
  );
}
