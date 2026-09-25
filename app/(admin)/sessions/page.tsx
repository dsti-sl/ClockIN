// app/(admin)/sessions/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList, Radio } from "lucide-react";
import { formatDate, statusLabel } from "@/lib/utils";
import type { Session } from "@/lib/types";

export const revalidate = 0;

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, event:events(id, name, event_date)")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const active  = sessions?.filter(s => s.status === "active")  ?? [];
  const pending = sessions?.filter(s => s.status === "pending") ?? [];
  const ended   = sessions?.filter(s => s.status === "ended")   ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
          <ClipboardList className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sessions</h1>
          <p className="text-sm text-gray-500">
            {sessions?.length ?? 0} session{sessions?.length !== 1 ? "s" : ""} across all events
          </p>
        </div>
      </div>

      {!sessions?.length && (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">No sessions yet</p>
          <p className="text-sm text-gray-400">
            Sessions are created inside events.{" "}
            <Link href="/events" className="text-indigo-600 hover:underline">Browse events →</Link>
          </p>
        </div>
      )}

      {active.length > 0 && (
        <SessionGroup
          title="Live now"
          sessions={active}
          accent="text-green-600 bg-green-50"
          icon={<Radio className="h-3.5 w-3.5 animate-pulse" />}
        />
      )}

      {pending.length > 0 && (
        <SessionGroup title="Upcoming" sessions={pending} accent="text-amber-600 bg-amber-50" />
      )}

      {ended.length > 0 && (
        <SessionGroup title="Ended" sessions={ended} accent="text-gray-500 bg-gray-100" />
      )}
    </div>
  );
}

type GroupSession = Session & { event: { id: string; name: string; event_date: string } | null };

function SessionGroup({
  title,
  sessions,
  accent,
  icon,
}: {
  title: string;
  sessions: GroupSession[];
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {icon && <span className={`rounded-full p-1 ${accent}`}>{icon}</span>}
      </div>
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/events/${s.event_id}/sessions/${s.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">
                  {s.event?.name ?? "Unknown event"}
                  {s.event?.event_date ? ` · ${formatDate(s.event.event_date)}` : ""}
                </p>
              </div>
              <span className={`badge-${s.status} flex-shrink-0`}>{statusLabel(s.status)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}