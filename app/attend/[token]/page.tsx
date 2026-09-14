// attend/[token]/page.tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getOrCreateDeviceId,
  getCachedAttendee,
  setCachedAttendee,
  hasSubmittedForScope,
  markSubmitted,
  haversineDistance,          // ← ADDED
} from '@/lib/utils'
import { validateAttendanceForm } from '@/lib/validation'
import type { TokenPayload } from '@/lib/types'
import { X, CheckCircle2, Loader2, Clock, MapPin, AlertCircle, RefreshCw, Search } from 'lucide-react'

type LocState = 'requesting' | 'granted' | 'denied' | 'unsupported'

const supabase = createClient()

export default function AttendPage() {
  const params = useParams()
  const token  = params.token as string

  const [eventData,   setEventData]   = useState<TokenPayload | null>(null)
  const [pageState,   setPageState]   = useState<'loading' | 'form' | 'success' | 'error'>('loading')
  const [fatalError,  setFatalError]  = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [expiry,      setExpiry]      = useState<number | null>(null)
  const [location,    setLocation]    = useState<{ lat: number; lng: number } | null>(null)
  const [locLabel,    setLocLabel]    = useState('')
  const [locState,    setLocState]    = useState<LocState>('requesting')
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const locStarted = useRef(false)

  // Event coordinates for geo‑fence
  const [eventCoords, setEventCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [maxDistance, setMaxDistance] = useState(150)

  const [form, setForm] = useState({
    full_name:   '',
    email:       '',
    phone:       '',
    institution: '',
    mda:         '',
    designation: '',
  })

  // MDA combobox (mirrors the add-admin MDA picker)
  const [mdas,        setMdas]        = useState<{ id: string; name: string }[]>([])
  const [mdaQuery,    setMdaQuery]    = useState('')
  const [mdaOpen,     setMdaOpen]     = useState(false)

  function startLocationRequest() {
    if (!navigator.geolocation) {
      setLocState('unsupported')
      return
    }
    setLocState('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocation({ lat, lng })
        setLocState('granted')
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        )
          .then(r => r.json())
          .then(d => {
            const addr  = d.address ?? {}
            const parts = [
              addr.road ?? addr.suburb ?? addr.neighbourhood,
              addr.city ?? addr.town   ?? addr.village,
              addr.country,
            ].filter(Boolean)
            setLocLabel(parts.length ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
          })
          .catch(() => setLocLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`))
      },
      err => {
        console.warn('[location] error', err.code, err.message)
        setLocState('denied')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    if (!locStarted.current) {
      locStarted.current = true
      setTimeout(startLocationRequest, 0)
    }

    let active = true

    ;(async () => {
      try {
        const configRes = await fetch('/api/config')
        if (configRes.ok) {
          const { geoFenceMaxDistance } = await configRes.json()
          if (typeof geoFenceMaxDistance === 'number' && geoFenceMaxDistance > 0) {
            setMaxDistance(geoFenceMaxDistance)
          }
        }
      } catch (e) {
        console.error('Failed to load geo-fence config', e)
      }
      try {
        const mdaRes = await fetch('/api/mdas/options')
        if (mdaRes.ok) {
          const { mdas: mdaList } = await mdaRes.json()
          if (Array.isArray(mdaList)) setMdas(mdaList)
        }
      } catch (e) {
        console.error('Failed to load MDA options', e)
      }
      try {
        await supabase.rpc('sync_event_statuses')
      } catch (e) {
        console.error('Failed to sync event statuses', e)
      }
      return supabase.rpc('validate_attendance_token', { p_token: token })
    })().then(async ({ data, error }) => {
      if (!active) return

      if (error || !data) {
        setFatalError('This QR code is invalid or has expired.')
        setPageState('error')
        return
      }

      const payload = data as TokenPayload
      setEventData(payload)

      // Fetch event coordinates if not already in payload
      const eventId = payload._token_type === 'session' ? payload.event_id : payload.id
      if (eventId) {
        const { data: evt } = await supabase
          .from('events')
          .select('lat, lng')
          .eq('id', eventId)
          .single()
        if (evt && evt.lat != null && evt.lng != null) {
          setEventCoords({ lat: evt.lat, lng: evt.lng })
        }
      }

      const cached = getCachedAttendee()
      if (cached) {
        setForm({
          full_name:   cached.full_name   ?? '',
          email:       cached.email       ?? '',
          phone:       cached.phone       ?? '',
          institution: cached.institution ?? '',
          mda:         cached.mda         ?? '',
          designation: cached.designation ?? '',
        })
      }

      const scopeId = payload._token_type === 'session'
        ? (payload.session_id ?? payload.id)
        : payload.id

      if (hasSubmittedForScope(scopeId)) {
        setFatalError('You have already checked in for this event.')
        setPageState('error')
        return
      }

      setExpiry(300)
      timerRef.current = setInterval(() => {
        setExpiry(prev => {
          if (!prev || prev <= 1) {
            clearInterval(timerRef.current!)
            setFatalError('QR session expired. Please scan again.')
            setPageState('error')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setPageState('form')
    })

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!location) {
      errs.location = locState === 'denied'
        ? 'Location access was denied. Enable it in your browser settings and tap Retry.'
        : 'Still fetching your location — please wait a moment.'
    }

    // ── Geo‑fence check ──────────────────────────────────────────────
    if (location && eventCoords) {
      const distance = haversineDistance(
        location.lat,
        location.lng,
        eventCoords.lat,
        eventCoords.lng
      )
      const MAX_DISTANCE = maxDistance
      if (distance > MAX_DISTANCE) {
        errs.location = `You are too far from the event location (${distance.toFixed(0)}m away). Please move closer.`
        setFieldErrors(errs)
        return
      }
    }

    const ve = validateAttendanceForm({
      full_name:   form.full_name,
      email:       form.email,
      phone:       form.phone,
      institution: form.institution,
      designation: form.designation,
    })
    Object.assign(errs, ve)

    if (!form.institution.trim()) errs.institution = 'Institution is required.'
    if (!form.designation.trim()) errs.designation = 'Designation is required.'

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    if (!eventData) return
    setSubmitting(true)

    const scopeId = eventData._token_type === 'session'
      ? (eventData.session_id ?? eventData.id)
      : eventData.id

    const { error: submitError } = await supabase.from('attendees').insert({
      event_id:           eventData._token_type === 'session' ? eventData.event_id! : eventData.id,
      session_id:         eventData._token_type === 'session' ? (eventData.session_id ?? eventData.id) : null,
      full_name:          form.full_name.trim(),
      email:              form.email.trim(),
      phone:              form.phone.trim(),
      institution:        form.institution.trim(),
      mda:                form.mda.trim() || null,
      designation:        form.designation.trim(),
      device_fingerprint: getOrCreateDeviceId(),
      qr_token_used:      token,
      lat:                location!.lat,
      lng:                location!.lng,
      location_label:     locLabel || null,
    })

    if (submitError) {
      let msg = submitError.message
      if (msg.includes('duplicate') || msg.includes('unique')) {
        if (msg.includes('phone')) {
          msg = 'This phone number has already been used for this event/session.'
        } else if (msg.includes('email')) {
          msg = 'This email has already been used for this event/session.'
        } else {
          msg = 'You have already checked in from this device.'
        }
      }
      setFieldErrors({ _form: msg })
      setSubmitting(false)
      return
    }

    setCachedAttendee(form)
    markSubmitted(scopeId)
    if (timerRef.current) clearInterval(timerRef.current)
    setPageState('success')
    setSubmitting(false)
  }

  const timeLeft    = expiry !== null ? `${Math.floor(expiry / 60)}:${String(expiry % 60).padStart(2, '0')}` : null
  const eventTitle  = eventData?.event_name ?? eventData?.name ?? ''
  const sessionName = eventData?._token_type === 'session' ? eventData?.name : null

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <X className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Check-in unavailable</h1>
        <p className="text-sm text-gray-500 max-w-xs">{fatalError}</p>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-green-50 to-white p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">Checked in!</h1>
        <p className="text-gray-500">
          Your attendance at <strong>{eventTitle}</strong>
          {sessionName ? ` — ${sessionName}` : ''} has been recorded.
        </p>
        {location && (
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" />
            {locLabel || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
          </p>
        )}
        <button
          onClick={() => { window.close(); window.location.href = 'about:blank' }}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          <X className="h-4 w-4" /> Close
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-6 space-y-5">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{eventTitle}</h1>
              {sessionName && (
                <p className="mt-0.5 text-sm text-indigo-600 font-medium">Session: {sessionName}</p>
              )}
            </div>
            {timeLeft && (
              <div className={`flex items-center gap-1 text-sm font-medium flex-shrink-0 ${
                expiry && expiry < 60 ? 'text-red-600' : 'text-orange-500'
              }`}>
                <Clock className="h-4 w-4" /> {timeLeft}
              </div>
            )}
          </div>

          {locState === 'requesting' && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-800">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              Requesting your location — please allow when prompted.
            </div>
          )}
          {locState === 'granted' && location && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-xs text-green-800">
              <MapPin className="h-4 w-4 flex-shrink-0 text-green-600" />
              <span className="min-w-0 truncate">
                {locLabel || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
              </span>
            </div>
          )}
          {(locState === 'denied' || locState === 'unsupported') && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
                <div>
                  <p className="font-semibold">Location required</p>
                  <p className="mt-0.5">
                    {locState === 'unsupported'
                      ? 'Your browser does not support location. Try Chrome or Safari.'
                      : 'Enable location in your browser settings, then tap Retry.'}
                  </p>
                </div>
              </div>
              {locState === 'denied' && (
                <button
                  type="button"
                  onClick={startLocationRequest}
                  className="flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1.5 font-medium hover:bg-red-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry location
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text" name="full_name" autoComplete="name"
                placeholder="Full name *"
                value={form.full_name}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, full_name: v }))
                  if (fieldErrors.full_name) setFieldErrors(p => { const c = { ...p }; delete c.full_name; return c })
                }}
                className={`input-base ${fieldErrors.full_name ? 'border-red-300 focus:border-red-400' : ''}`}
                maxLength={32} required
              />
              {fieldErrors.full_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.full_name}</p>}
            </div>

            <div>
              <input
                type="email" name="email" autoComplete="email"
                placeholder="Email address *"
                value={form.email}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, email: v }))
                  if (fieldErrors.email) setFieldErrors(p => { const c = { ...p }; delete c.email; return c })
                }}
                className={`input-base ${fieldErrors.email ? 'border-red-300 focus:border-red-400' : ''}`}
                required
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div>
              <input
                type="tel" name="phone" autoComplete="tel-national"
                placeholder="Phone number *"
                value={form.phone}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, phone: v }))
                  if (fieldErrors.phone) setFieldErrors(p => { const c = { ...p }; delete c.phone; return c })
                }}
                className={`input-base ${fieldErrors.phone ? 'border-red-300 focus:border-red-400' : ''}`}
                maxLength={15} required
              />
              {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
            </div>

            <div>
              <input
                type="text" name="institution" autoComplete="organization"
                placeholder="Institution *"
                value={form.institution}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, institution: v }))
                  if (fieldErrors.institution) setFieldErrors(p => { const c = { ...p }; delete c.institution; return c })
                }}
                className={`input-base ${fieldErrors.institution ? 'border-red-300 focus:border-red-400' : ''}`}
                required
              />
              {fieldErrors.institution && <p className="mt-1 text-xs text-red-500">{fieldErrors.institution}</p>}
            </div>

            {/* MDA combobox — optional, mirrors the add-admin MDA picker */}
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={mdaOpen}
                  aria-controls="attendee-mda-listbox"
                  aria-autocomplete="list"
                  autoComplete="off"
                  placeholder={mdas.length ? 'MDA (optional) — start typing…' : 'MDA list unavailable'}
                  value={mdaQuery}
                  onChange={e => {
                    const v = e.target.value
                    setMdaQuery(v)
                    const exact = mdas.find(m => m.name.toLowerCase() === v.trim().toLowerCase())
                    setForm(f => ({ ...f, mda: exact ? exact.name : v.trim() }))
                    if (fieldErrors.mda) setFieldErrors(p => { const c = { ...p }; delete c.mda; return c })
                    setMdaOpen(true)
                  }}
                  onFocus={() => setMdaOpen(true)}
                  onBlur={() => setTimeout(() => setMdaOpen(false), 120)}
                  className="input-base pl-9"
                />
                {form.mda && (
                  <button
                    type="button"
                    aria-label="Clear MDA"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setForm(f => ({ ...f, mda: '' }))
                      setMdaQuery('')
                      setMdaOpen(false)
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {mdaOpen && (
                <ul
                  id="attendee-mda-listbox"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  {(() => {
                    const q = mdaQuery.trim().toLowerCase()
                    const matches = q ? mdas.filter(m => m.name.toLowerCase().includes(q)) : mdas
                    if (matches.length === 0) {
                      return (
                        <li className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">No MDA found matching “{mdaQuery.trim()}”.</li>
                      )
                    }
                    return matches.map(m => (
                      <li key={m.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={m.name === form.mda}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setForm(f => ({ ...f, mda: m.name }))
                            setMdaQuery(m.name)
                            setMdaOpen(false)
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                            m.name === form.mda
                              ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-slate-700 dark:text-white'
                              : 'text-gray-700 dark:text-slate-200'
                          }`}
                        >
                          {m.name}
                        </button>
                      </li>
                    ))
                  })()}
                </ul>
              )}
              {fieldErrors.mda && <p className="mt-1 text-xs text-red-500">{fieldErrors.mda}</p>}
            </div>

            <div>
              <input
                type="text" name="designation" autoComplete="organization-title"
                placeholder="Designation / Role *"
                value={form.designation}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, designation: v }))
                  if (fieldErrors.designation) setFieldErrors(p => { const c = { ...p }; delete c.designation; return c })
                }}
                className={`input-base ${fieldErrors.designation ? 'border-red-300 focus:border-red-400' : ''}`}
                required
              />
              {fieldErrors.designation && <p className="mt-1 text-xs text-red-500">{fieldErrors.designation}</p>}
            </div>

            {fieldErrors.location && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{fieldErrors.location}</p>
            )}
            {fieldErrors._form && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{fieldErrors._form}</p>
            )}

            <button
              type="submit"
              disabled={submitting || locState === 'requesting'}
              className="btn-primary w-full disabled:opacity-60"
            >
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : locState === 'requesting'
                ? 'Waiting for location…'
                : 'Check In'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}