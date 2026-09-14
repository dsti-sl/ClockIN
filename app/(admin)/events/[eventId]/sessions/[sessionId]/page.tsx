// app/(admin)/events/[eventId]/sessions/[sessionId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import QRDisplay from "@/components/qr/QRDisplay";
import HeatMap from "@/components/attendance/HeatMap";
import AttendeeTable from "@/components/attendance/AttendeeTable";
import { ChevronLeft, AlertTriangle, RotateCcw } from "lucide-react";
import { statusLabel } from "@/lib/utils";
import type { Attendee, RevivalNote } from "@/lib/types";
import StartSessionButton from "@/components/events/StartSessionButton";
import EndSessionButton from "@/components/events/EndSessionButton";
import DownloadAttendeesButton from "@/components/events/DownloadAttendeesButton";
import ManualAttendanceUpload from "@/components/attendance/ManualAttendanceUpload";

export const revalidate = 0;

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; sessionId: string }>;
}) {
  const { eventId, sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*, event:events(id,name,location,event_date,lat,lng,status)")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  const { data: attendees } = await supabase
    .from("attendees")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const { data: revivalNotes } = await supabase
    .from("revival_notes")
    .select("*")
    .eq("scope_type", "session")
    .eq("scope_id", sessionId)
    .order("created_at", { ascending: false });

  const safeAttendees: Attendee[] = attendees ?? [];
  const safeNotes: RevivalNote[]  = revivalNotes ?? [];
  const latestNote                = safeNotes[0] ?? null;

  return (
    <div className="space-y-6 p-4 lg:p-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/events`}
            className="mb-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200">
            <ChevronLeft className="h-3.5 w-3.5" /> {session.status === "ended" || session.status === "archived" ? "Back to events" : session.event?.name}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{session.name}</h1>
            <span className={`badge-${session.status}`}>{statusLabel(session.status)}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">{session.event?.location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {safeAttendees.length > 0 && session.event && (
            <DownloadAttendeesButton
              eventName={session.event.name}
              location={session.event.location}
              eventDate={session.event.event_date}
              sessionName={session.name}
              attendees={safeAttendees}
            />
          )}
          {session.status !== "archived" && (
            <Link href={`/events/${eventId}/sessions/${sessionId}/edit`} className="btn-secondary">Edit</Link>
          )}
          {session.status === "pending"  && <StartSessionButton sessionId={sessionId} />}
          {session.status === "active"   && <EndSessionButton   sessionId={sessionId} />}
          {(session.status === "ended" || session.status === "archived") && (
  <Link href={`/events/${eventId}/sessions/${sessionId}/revive`} className="btn-primary inline-flex items-center gap-1.5"><RotateCcw className="h-4 w-4" />Revive Session</Link>
)}
        </div>
      </div>

      {/* Revival note banner */}
      {latestNote && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="font-semibold mb-0.5">
              Revival note
              {safeNotes.length > 1 && (
                <span className="ml-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">({safeNotes.length} revivals)</span>
              )}
            </p>
            <p>{latestNote.note}</p>
            <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
              {new Date(latestNote.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {session.started_at && (
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Started</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-slate-200">
              {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>

      {/* QR code */}
      {session.status === "active" && session.qr_token && (
        <div className="card p-6 flex justify-center">
          <QRDisplay token={session.qr_token} label={`Session: ${session.name}`} />
        </div>
      )}

      {/* Full-width attendee table */}
      <AttendeeTable
        attendees={safeAttendees}
        revivalAt={latestNote?.created_at ?? null}
      />

      {/* Manual attendance */}
      <ManualAttendanceUpload
        eventId={eventId}
        sessionId={sessionId}
        eventLocation={session.event?.location}
        eventLat={session.event?.lat}
        eventLng={session.event?.lng}
      />

      {/* Full-width map */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Attendee Map</h2>
        <HeatMap
          key={safeAttendees.length}
          attendees={safeAttendees}
          centerLat={session.event?.lat ?? undefined}
          centerLng={session.event?.lng ?? undefined}
        />
      </div>

      {/* Revival history */}
      {safeNotes.length > 1 && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Revival history</p>
          {safeNotes.map((n) => (
            <div key={n.id} className="border-l-2 border-amber-300 pl-3">
              <p className="text-xs text-gray-700 dark:text-slate-200">{n.note}</p>
              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-400">
                {new Date(n.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}