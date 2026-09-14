// app/(admin)/dashboard/page.tsx
import { createClient, getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { Calendar, Radio, CheckCircle2, Archive, Plus } from "lucide-react";
import type { DashboardStats, Event } from "@/lib/types";
import MonthlyAttendeesChart from "@/components/analytics/MonthlyAttendeesChart";
import DashboardUI from "@/components/pages/dashboard/DashboardUI";

export const revalidate = 30;

const empty = { count: 0 } as const;

type RecentEvent = Pick<
  Event,
  "id" | "name" | "status" | "event_date" | "has_sessions"
>;

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .single();

  const isSuperAdmin = profile?.is_super_admin ?? false;

  const today = new Date().toISOString().split("T")[0];

  let stats: DashboardStats;
  let pastEvents = 0;
  let recentEvents: RecentEvent[] | null = null;

  if (isSuperAdmin) {
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

  const statCards = [
    {
      label: "Total Daily Events",
      value: stats.total_events,
      icon: Calendar,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active sessions",
      value: stats.active_sessions,
      icon: Radio,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Total Daily Attendees",
      value: stats.total_checkins,
      icon: CheckCircle2,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Total Past Events",
      value: pastEvents,
      icon: Archive,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <DashboardUI
      stats={stats}
      pastEvents={pastEvents}
      recentEvents={recentEvents}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
