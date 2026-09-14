// app/(admin)/events/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateToken } from '@/lib/utils'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import LocationPicker from '@/components/events/LocationPicker'   // NEW

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '', location: '', description: '',
    event_date: '', start_time: '', end_time: '',
  })
  const [hasSessions, setHasSessions] = useState(false)
  const [defaultSessionName, setDefaultSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Location picker toggle (optional)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate end time is after start time
    if (form.end_time && form.end_time <= form.start_time) {
      setError('End time must be after start time.')
      return
    }

    if (hasSessions && !defaultSessionName.trim()) {
      setError('Please enter a name for the default session.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const token = generateToken()

      const { data: event, error: eventErr } = await supabase.from('events').insert({
        name: form.name.trim(),
        location: form.location.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
        has_sessions: hasSessions,
        qr_token: hasSessions ? null : token,
        created_by: user?.id,
        lat: showLocationPicker ? lat : null,
        lng: showLocationPicker ? lng : null,
      }).select('id').single()

      if (eventErr) throw eventErr

      if (!hasSessions) {
        await supabase.from('qr_tokens').insert({
          token, token_type: 'event', event_id: event.id, is_active: true,
        })
      }

      if (hasSessions && defaultSessionName.trim()) {
        const sessionToken = generateToken()
        const { data: sess } = await supabase.from('sessions').insert({
          event_id: event.id,
          name: defaultSessionName.trim(),
          status: 'pending',
          qr_token: sessionToken,
        }).select('id').single()

        if (sess) {
          await supabase.from('qr_tokens').insert({
            token: sessionToken, token_type: 'session',
            event_id: event.id, session_id: sess.id, is_active: true,
          })
        }
      }

      router.push(`/events/${event.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link href="/events" className="btn-ghost p-2"><ChevronLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold">New event</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Event name *</label>
          <input required className="input-base" placeholder="Annual General Meeting"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Location *</label>
          <input required className="input-base" placeholder="Main Conference Hall"
            value={form.location} onChange={e => set('location', e.target.value)} />
        </div>

        {/* ── Location toggle ──────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Pin location on map</p>
              <p className="text-xs text-gray-500 mt-0.5">Optional – restrict check‑ins to a specific area</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowLocationPicker(v => !v);
                if (!showLocationPicker) { setLat(null); setLng(null); }
              }}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${showLocationPicker ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${showLocationPicker ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {showLocationPicker && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <LocationPicker
                onLocationSelect={(latitude, longitude, addressName) => {
                  setLat(latitude);
                  setLng(longitude);
                  setForm(f => ({ ...f, location: addressName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
                }}
              />
              <p className="text-xs text-gray-400 mt-2">
                Use your current GPS location or search for a place. Attendees will need to be within 150 m.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="label">Event overview</label>
          <textarea className="input-base resize-none" rows={2} placeholder="Provide a short overview, agenda, or important details about this event"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div>
          <label className="label">Date *</label>
          <input required type="date" className="input-base" min={today}
            value={form.event_date} onChange={e => set('event_date', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start time *</label>
            <input required type="time" className="input-base"
              value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          </div>
          <div>
            <label className="label">End time *</label>
            <input
              required
              type="time"
              className="input-base"
              min={form.start_time || undefined}
              value={form.end_time}
              onChange={e => set('end_time', e.target.value)}
            />
          </div>
        </div>

        {/* Sessions toggle */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">Enable sessions</p>
              <p className="text-xs text-gray-500 mt-0.5">Split into named segments (morning, afternoon…)</p>
            </div>
            <button
              type="button"
              onClick={() => setHasSessions(v => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${hasSessions ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hasSessions ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {hasSessions ? (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              <p className="text-xs text-indigo-600 font-medium">
                Sessions require manual start. A default session will be created automatically.
              </p>
              <label className="label">Default session name *</label>
              <input className="input-base" placeholder="e.g. Morning Session, Opening Plenary"
                value={defaultSessionName} onChange={e => setDefaultSessionName(e.target.value)} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-400">
              A single QR code is generated automatically. Attendees scan once and are recorded in a unified list.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create event'}
        </button>
      </form>
    </div>
  )
}