// components/admin/NewAdminForm.tsx
'use client'
import { useRef, useState } from 'react'
import { Loader2, ChevronLeft, Info, MailCheck, Search, XCircle } from 'lucide-react'
import Link from 'next/link'

type MdaOption = { id: string; name: string }

export default function NewAdminForm({ mdas }: { mdas: MdaOption[] }) {
  const [form,    setForm]    = useState({ full_name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sentTo,  setSentTo]  = useState<string | null>(null)

  const [mdaQuery,   setMdaQuery]   = useState('')
  const [mdaId,      setMdaId]      = useState('')
  const [mdaOpen,    setMdaOpen]    = useState(false)
  const mdaInputRef  = useRef<HTMLInputElement>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const q = mdaQuery.trim().toLowerCase()
  const mdaMatches = q
    ? mdas.filter(m => m.name.toLowerCase().includes(q))
    : mdas
  const mdaNotFound = q.length > 0 && mdaMatches.length === 0

  function handleMdaInput(v: string) {
    setMdaQuery(v)
    const exact = mdas.find(m => m.name.toLowerCase() === v.trim().toLowerCase())
    setMdaId(exact?.id ?? '')
    setMdaOpen(true)
  }

  function pickMda(m: MdaOption) {
    setMdaQuery(m.name)
    setMdaId(m.id)
    setMdaOpen(false)
  }

  function resetMda() {
    setMdaQuery('')
    setMdaId('')
    setMdaOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Full name, email and phone are required.')
      return
    }
    if (!mdaId) {
      // Nudge: open the option list so they can pick a valid MDA
      setMdaOpen(true)
      mdaInputRef.current?.focus()
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email:     form.email.toLowerCase().trim(),
          phone:     form.phone.trim(),
          mda_id:    mdaId,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }

      setSentTo(form.email.toLowerCase().trim())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-sm pt-10 text-center space-y-4 p-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/40">
          <MailCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invitation sent</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          A setup link has been emailed to <strong>{sentTo}</strong>. They will use it to
          create their own password and complete their account.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSentTo(null)
              setForm({ full_name: '', email: '', phone: '' })
              resetMda()
            }}
            className="btn-secondary"
          >
            Invite another
          </button>
          <Link href="/users" className="btn-primary">Done</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/users" className="btn-ghost p-2"><ChevronLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add admin</h1>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        The admin will receive an email with a secure link to set their own password. Their
        details below are carried over automatically.
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Full name *</label>
          <input required className="input-base" placeholder="Samuel Nicolls"
            value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Email address *</label>
          <input required type="email" className="input-base" placeholder="admin@moe.gov.sl"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input required type="tel" className="input-base" placeholder="+232 76 000 000"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>

        {/* MDA combobox — type to filter, must match a known MDA */}
        <div className="relative">
          <label className="label">Ministry / Department (MDA) *</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
            <input
              ref={mdaInputRef}
              type="text"
              role="combobox"
              aria-expanded={mdaOpen}
              aria-controls="mda-listbox"
              aria-autocomplete="list"
              autoComplete="off"
              placeholder={mdas.length ? 'Start typing to search…' : 'No MDAs available'}
              value={mdaQuery}
              onChange={e => handleMdaInput(e.target.value)}
              onFocus={() => setMdaOpen(true)}
              onBlur={() => setMdaOpen(false)}
              className={`input-base pl-9 ${
                mdaNotFound
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-800 dark:focus:ring-red-950'
                  : ''
              }`}
            />
          </div>

          {mdaNotFound && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
              No MDA found matching “{mdaQuery.trim()}” — check the spelling.
            </p>
          )}

          {mdaOpen && mdaMatches.length > 0 && (
            <ul
              id="mda-listbox"
              role="listbox"
              className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              {mdaMatches.map(m => (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={m.id === mdaId}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pickMda(m)}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                      m.id === mdaId
                        ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-slate-700 dark:text-white'
                        : 'text-gray-700 dark:text-slate-200'
                    }`}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={loading || mdas.length === 0} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invitation'}
        </button>
      </form>
    </>
  )
}
