// app/(admin)/events/page.tsx
// Regular admins only see their own events; super admins see all.
import { createClient, getUser } from "@/lib/supabase/server";
import EventsUI from "@/components/pages/event/EventsUI";

export const revalidate = 0;

type EventRow = {
  id: string;
  name: string;
  location: string;
  event_date: string;
  archived_at: string | null;
  status: string;
  creator?: { full_name: string | null; email: string | null } | null;
};

type SessionRow = {
  id: string;
  name: string;
  event_id: string;
  archived_at: string | null;
  status: string;
  event: { id: string; name: string } | null;
};

export default async function EventsPage() {
  const user = await getUser();

  if (!user) return;
  const supabase = await createClient();

  await supabase.rpc("sync_event_statuses");

  // Check if current user is super admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.is_super_admin ?? false;

  // Super admins see all events; regular admins only see their own
  let eventQuery = supabase
    .from("events")
    .select("*, creator:profiles!events_created_by_fkey (full_name, email)")
    .order("event_date", { ascending: false });

  if (!isSuperAdmin) {
    eventQuery = eventQuery.eq("created_by", user.id);
  }

  // Sessions scoped to the same events
  let sessionQuery = supabase
    .from("sessions")
    .select("*, event:events(id, name, created_by)")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin) {
    const { data: userEvents } = await supabase
      .from("events")
      .select("id")
      .eq("created_by", user.id);

    const eventIds = userEvents?.map((e) => e.id) ?? [];
    if (eventIds.length === 0) {
      sessionQuery = sessionQuery.eq("event_id", "00000000-0000-0000-0000-000000000000");
    } else {
      sessionQuery = sessionQuery.in("event_id", eventIds);
    }
  }

  const [{ data: events }, { data: sessions }] = await Promise.all([
    eventQuery,
    sessionQuery,
  ]);

  return (
    <EventsUI
      events={(events ?? []) as EventRow[]}
      sessions={(sessions ?? []) as SessionRow[]}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
