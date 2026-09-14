// components/events/DeleteEventButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  eventId: string;
  eventName: string;
}

export default function DeleteEventButton({ eventId, eventName }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    // Cascade: deactivate QR tokens, delete attendees, sessions, then event.
    // If you have ON DELETE CASCADE in your DB schema, only the last step is needed.
    // We do it explicitly for safety.
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    router.push("/events");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      {/* Confirmation Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl dark:bg-slate-800">
            <div className="p-6 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delete event?</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                  <strong>{eventName}</strong> and all its attendees, sessions, and QR tokens will be
                  permanently deleted. This cannot be undone.
                </p>
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setOpen(false); setError(""); }}
                  disabled={loading}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}