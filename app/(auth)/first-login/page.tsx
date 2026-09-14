// app/(auth)/first-login/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BarChart3, Eye, EyeOff, XCircle, User, Phone, Mail, Building2, BadgeInfo, MapPin, ChevronDown } from 'lucide-react'

type Stage = 'linking' | 'ready' | 'invalid'

type InviteDetails = {
  full_name:   string
  email:       string
  phone:       string
  mda_name:    string
  designation: string
  district:    string
}

const SIERRA_LEONE_DISTRICTS = [
  'Bo', 'Bombali', 'Bonthe', 'Falaba', 'Kailahun', 'Kambia', 'Karene', 'Kenema',
  'Koinadugu', 'Kono', 'Moyamba', 'Port Loko', 'Pujehun', 'Tonkolili',
  'Western Area Rural', 'Western Area Urban',
]

export default function FirstLoginPage() {
  const router    = useRouter()
  const supabase  = createClient()

  const [stage,      setStage]      = useState<Stage>('linking')
  const [details,    setDetails]    = useState<InviteDetails | null>(null)
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [district,   setDistrict]   = useState('')
  const [districtOpen, setDistrictOpen] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')

  // Pull the invite details (name, email, phone, MDA) carried over from the
  // add-admin form so they can be shown pre-filled in this form.
  async function loadDetails() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch the base profile fields plus the linked MDA id so a failure in the
    // MDA lookup can never wipe out the name / phone / email values.
    const { data: profileRaw, error: profileErr } = await supabase
      .from('profiles')
      .select('full_name, phone, email, mda_id, designation, district')
      .eq('id', user.id)
      .single()

    if (profileErr) {
      console.error('first-login: failed to load profile', profileErr)
    }

    const profile = profileRaw as {
      full_name?: string | null
      phone?: string | null
      email?: string | null
      mda_id?: string | null
      designation?: string | null
      district?: string | null
    } | null

    // Best-effort MDA name lookup (plain query on mdas by id — no embedded join).
    let mdaName = ''
    if (profile?.mda_id) {
      const { data: mda } = await supabase
        .from('mdas')
        .select('name')
        .eq('id', profile.mda_id)
        .single()
      mdaName = (mda as { name?: string } | null)?.name ?? ''
    }

    setDetails({
      full_name:   profile?.full_name ?? '',
      email:       profile?.email ?? user.email ?? '',
      phone:       profile?.phone ?? '',
      mda_name:    mdaName,
      designation: profile?.designation ?? '',
      district:    profile?.district ?? '',
    })
    setDistrict(profile?.district ?? '')
  }

  // Exchange the invite token(s) from the email link for a session
  useEffect(() => {
    async function link() {
      const params = new URLSearchParams(window.location.search)
      if (params.get('error')) {
        setStage('invalid')
        return
      }

      let linked = false

      // 1) PKCE-style redirect: ?code=...
      const code = params.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        linked = !error
      }

      // 2) Default Supabase invite email: tokens in the URL fragment (#access_token=...)
      if (!linked && window.location.hash.includes('access_token')) {
        const hash = new URLSearchParams(window.location.hash.slice(1))
        const accessToken  = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          linked = !error
        }
      }

      // 3) Already linked via /auth/confirm server-side
      if (!linked) {
        const { data: { user } } = await supabase.auth.getUser()
        linked = !!user
      }

      if (!linked) {
        setStage('invalid')
        return
      }

      setStage('ready')
      await loadDetails()
    }
    void link()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }

    setSaving(true)

    try {
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message)

    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          designation:   details?.designation?.trim() || null,
          district:      district || null,
          is_first_login: false,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', user.id)
      if (profileError) throw new Error(profileError.message)
    }

    router.replace('/dashboard')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4 py-10 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-4xl">
        {stage === 'linking' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Verifying your invitation…</p>
          </div>
        )}

        {stage === 'invalid' && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <XCircle className="h-12 w-12 text-red-400" />
            <h1 className="text-xl font-bold text-gray-900">Link invalid or expired</h1>
            <p className="text-sm text-gray-500">
              This invitation link is no longer valid. Ask your administrator to send a new invitation.
            </p>
          </div>
        )}

        {stage === 'ready' && (
          <>
            {/* Welcome header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome to Smart Attendance
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Your details are carried over from your invitation — create a password to secure your account.
              </p>
            </div>

            {/* Single landscape form: fields arranged in two-per-row, prefilled details are read-only */}
            <div className="card p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Full name</label>
                    <div className="relative">
                      <input readOnly value={details?.full_name ?? ''} className="input-base pl-9 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800/60 dark:text-slate-500" />
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email address</label>
                    <div className="relative">
                      <input readOnly value={details?.email ?? ''} className="input-base pl-9 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800/60 dark:text-slate-500" />
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Phone number</label>
                    <div className="relative">
                      <input readOnly value={details?.phone ?? ''} className="input-base pl-9 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800/60 dark:text-slate-500" />
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Ministry / Department (MDA)</label>
                    <div className="relative">
                      <input readOnly value={details?.mda_name ?? ''} className="input-base pl-9 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-slate-800/60 dark:text-slate-500" />
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Designation</label>
                    <div className="relative">
                      <input
                        className="input-base bg-white pl-9"
                        placeholder="e.g. Admin, Director, Officer"
                        value={details?.designation ?? ''}
                        onChange={e => setDetails(d => (d ? { ...d, designation: e.target.value } : d))}
                      />
                      <BadgeInfo className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-slate-600" />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="label">District</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 dark:text-slate-600" />
                      <button
                        type="button"
                        onClick={() => setDistrictOpen(v => !v)}
                        className="input-base bg-white w-full pl-9 pr-10 text-left"
                      >
                        <span className={district ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}>
                          {district || 'Select a district…'}
                        </span>
                      </button>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                    </div>
                    {districtOpen && (
                      <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {SIERRA_LEONE_DISTRICTS.map(d => (
                          <li key={d}>
                            <button
                              type="button"
                              onClick={() => { setDistrict(d); setDistrictOpen(false) }}
                              className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                                district === d
                                  ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-slate-700 dark:text-white'
                                  : 'text-gray-700 dark:text-slate-200'
                              }`}
                            >
                              {d}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="label">New password *</label>
                    <div className="relative">
                      <input
                        required
                        type={showPw ? 'text' : 'password'}
                        className="input-base bg-white pr-10"
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirm password *</label>
                    <input
                      required
                      type={showPw ? 'text' : 'password'}
                      className="input-base bg-white"
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                    />
                  </div>
                </div>

                {formError && <p className="text-xs text-red-600">{formError}</p>}

                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save password & continue'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
