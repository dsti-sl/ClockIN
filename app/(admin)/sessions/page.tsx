// app/(admin)/sessions/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import SessionsList, { type SessionListItem } from "@/components/pages/sessions/SessionsList";

export const revalidate = 0;

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, event:events(id, name, event_date)")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

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

      {!sessions?.length ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">No sessions yet</p>
          <p className="text-sm text-gray-400">
            Sessions are created inside events.{" "}
            <Link href="/events" className="text-indigo-600 hover:underline">Browse events →</Link>
          </p>
        </div>
      ) : (
        <SessionsList sessions={sessions as SessionListItem[]} />
      )}
    </div>
  );
}
