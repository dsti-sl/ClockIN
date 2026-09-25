'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Eye, X, MapPin, Phone, Mail, Building2, BadgeInfo, Clock, ChevronLeft, ChevronRight, Search, Pencil, Trash2, Loader2 } from 'lucide-react'
import { validateAttendanceForm, type FormErrors } from '@/lib/validation'
import type { Attendee } from '@/lib/types'

interface Props {
  attendees:   Attendee[]
  revivalAt?:  string | null
}

export default function AttendeeTable({ attendees, revivalAt }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Attendee | null>(null)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(5)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    institution: '',
    mda: '',
    designation: '',
    location: '',
  })
  const [mdaQuery, setMdaQuery] = useState('')
  const [mdaOpen,  setMdaOpen]  = useState(false)
  const [mdas,     setMdas]     = useState<{ id: string; name: string }[]>([])
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('mdas')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setMdas(data as { id: string; name: string }[])
      })
  }, [supabase])

  const rows = attendees.filter(a => !deletedIds.has(a.id))

  const filtered = rows.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.full_name.toLowerCase().includes(q) ||
      (a.institution ?? '').toLowerCase().includes(q) ||
      (a.mda ?? '').toLowerCase().includes(q) ||
      (a.designation ?? '').toLowerCase().includes(q) ||
      (a.phone ?? '').toLowerCase().includes(q) ||
      (a.email ?? '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const paginated = filtered.slice(currentPage * perPage, (currentPage + 1) * perPage)

  const perPageOptions = [5, 10, 15, 25, 50]

  function refresh() {
    startTransition(() => router.refresh())
  }

  function openAttendee(a: Attendee) {
    setSelected(a)
    setEditing(false)
    setConfirmDelete(false)
    setActionError('')
    setEditErrors({})
  }

  function startEdit() {
    if (!selected) return
    setEditForm({
      full_name:    selected.full_name,
      phone:        selected.phone,
      email:        selected.email || '',
      institution:  selected.institution || '',
      mda:          selected.mda || '',
      designation:  selected.designation || '',
      location:     selected.location_label?.replace(/\s*\(Entered by Admin\)$/i, '') || '',
    })
    setMdaQuery(selected.mda || '')
    setEditErrors({})
    setActionError('')
    setConfirmDelete(false)
    setEditing(true)
  }

  async function saveEdit() {
    if (!selected) return
    const errors = validateAttendanceForm(editForm)
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }
    setSaving(true)
    setActionError('')

    const locationLabel = editForm.location.trim() || 'Event Location'
    const { error } = await supabase
      .from('attendees')
      .update({
        full_name:       editForm.full_name.trim(),
        phone:           editForm.phone.trim(),
        email:           editForm.email.trim(),
        institution:     editForm.institution.trim(),
        mda:             editForm.mda.trim() || null,
        designation:     editForm.designation.trim(),
        location_label:  locationLabel,
      })
      .eq('id', selected.id)

    setSaving(false)
    if (error) {
      let msg = error.message
      if (msg.includes('duplicate') || msg.includes('unique')) {
        msg = 'This attendee already exists for this event/session (duplicate phone or email).'
      }
      setActionError(msg)
      return
    }
    setSelected({
      ...selected,
      full_name:       editForm.full_name.trim(),
      phone:           editForm.phone.trim(),
      email:           editForm.email.trim(),
      institution:     editForm.institution.trim(),
      mda:             editForm.mda.trim() || null,
      designation:     editForm.designation.trim(),
      location_label:  locationLabel,
    })
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    setActionError('')
    const { error } = await supabase.from('attendees').delete().eq('id', selected.id)
    setDeleting(false)
    if (error) {
      setActionError(error.message)
      return
    }
    setSelected(null)
    setConfirmDelete(false)
    setDeletedIds(prev => new Set(prev).add(selected.id))
    router.refresh()
  }

  function closeModal() {
    setSelected(null)
    setEditing(false)
    setConfirmDelete(false)
    setActionError('')
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-3 dark:border-slate-800">
        <h2 className="section-title">
          Attendees
          <span className="ml-2 text-sm font-normal text-gray-400 dark:text-slate-400">({rows.length})</span>
        </h2>
        <button
          onClick={refresh}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search bar */}
      <div className="px-5 py-2 border-b border-gray-100 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name, institution, designation…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 transition-colors"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-slate-400">
          {rows.length === 0
            ? 'No check-ins yet. Share the QR code to start collecting attendance.'
            : 'No attendees match your search.'}
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on small screens */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2.5 text-left w-10">#</th>
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">Institution</th>
                  <th className="px-4 py-2.5 text-left">MDA</th>
                  <th className="px-4 py-2.5 text-left">Designation</th>
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-center w-16">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {paginated.map((a, i) => {
                  const isPostRevival = revivalAt
                    ? new Date(a.created_at) > new Date(revivalAt)
                    : false

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-800/60 ${isPostRevival ? 'bg-amber-50/40 dark:bg-amber-950/30' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-gray-400 dark:text-slate-400 tabular-nums">{currentPage * perPage + i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {a.full_name}
                        {a.method === 'manual' && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-800">
                            Admin
                          </span>
                        )}
                        {isPostRevival && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800">
                            post-revival
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-slate-300">{a.institution ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-slate-300">{a.mda ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-slate-300">{a.designation ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-slate-400 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => openAttendee(a)}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 dark:text-slate-300 hover:bg-gray-100 hover:text-gray-700 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — shown only on small screens */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800">
            {paginated.map((a, i) => {
              const isPostRevival = revivalAt
                ? new Date(a.created_at) > new Date(revivalAt)
                : false

              return (
                <div
                  key={a.id}
                  className={`px-4 py-3 space-y-1.5 ${isPostRevival ? 'bg-amber-50/40 dark:bg-amber-950/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 dark:text-slate-400 tabular-nums flex-shrink-0">{currentPage * perPage + i + 1}.</span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{a.full_name}</span>
                      {a.method === 'manual' && (
                        <span className="flex-shrink-0 inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-800">
                          Admin
                        </span>
                      )}
                      {isPostRevival && (
                        <span className="flex-shrink-0 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800">
                          post-revival
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openAttendee(a)}
                      className="flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 dark:text-slate-300 hover:bg-gray-100 hover:text-gray-700 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
                      title="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-300">
                    {a.institution && (
                      <span className="truncate">{a.institution}</span>
                    )}
                   
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-300">
                   
                    {a.designation && (
                      <>
                        <span className="text-gray-300 hidden empty:hidden dark:text-slate-600">·</span>
                        <span className="truncate">{a.designation}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-400">
                    {new Date(a.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 dark:text-slate-400">Rows:</label>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(0) }}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 dark:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800"
            >
              {perPageOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 dark:text-slate-400">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` · Page ${currentPage + 1} of ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{selected.full_name}</h3>
                {selected.method === 'manual' && (
                  <span className="flex-shrink-0 inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-800">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="flex-shrink-0 rounded-lg p-1 text-gray-400 dark:text-slate-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editing ? (
              <div className="space-y-3 px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Full name *</label>
                    <input
                      className="input-base"
                      value={editForm.full_name}
                      onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Attendee full name"
                    />
                    {editErrors.full_name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.full_name}</p>}
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input
                      className="input-base"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                    {editErrors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      className="input-base"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="Email address"
                    />
                    {editErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.email}</p>}
                  </div>
                  <div>
                    <label className="label">Institution *</label>
                    <input
                      className="input-base"
                      value={editForm.institution}
                      onChange={e => setEditForm(f => ({ ...f, institution: e.target.value }))}
                      placeholder="Institution / organization"
                    />
                    {editErrors.institution && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.institution}</p>}
                  </div>
                  <div className="relative">
                    <label className="label">MDA (optional)</label>
                    <div className="relative">
                      <input
                        type="text"
                        role="combobox"
                        aria-expanded={mdaOpen}
                        aria-controls="edit-mda-listbox"
                        aria-autocomplete="list"
                        autoComplete="off"
                        placeholder={mdas.length ? 'Start typing to search…' : 'No MDAs available'}
                        value={mdaQuery}
                        onChange={e => {
                          const v = e.target.value
                          setMdaQuery(v)
                          const exact = mdas.find(m => m.name.toLowerCase() === v.trim().toLowerCase())
                          setEditForm(f => ({ ...f, mda: exact ? exact.name : v.trim() }))
                          setMdaOpen(true)
                        }}
                        onFocus={() => setMdaOpen(true)}
                        onBlur={() => setTimeout(() => setMdaOpen(false), 120)}
                        className="input-base"
                      />
                      {editForm.mda && (
                        <button
                          type="button"
                          aria-label="Clear MDA"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setEditForm(f => ({ ...f, mda: '' }))
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
                        id="edit-mda-listbox"
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
                                aria-selected={m.name === editForm.mda}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  setEditForm(f => ({ ...f, mda: m.name }))
                                  setMdaQuery(m.name)
                                  setMdaOpen(false)
                                }}
                                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                                  m.name === editForm.mda
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
                  </div>
                  <div>
                    <label className="label">Designation *</label>
                    <input
                      className="input-base"
                      value={editForm.designation}
                      onChange={e => setEditForm(f => ({ ...f, designation: e.target.value }))}
                      placeholder="Designation / role"
                    />
                    {editErrors.designation && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.designation}</p>}
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        className="input-base pl-9"
                        value={editForm.location}
                        onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="Event default location"
                      />
                    </div>
                  </div>
                </div>

                {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onClick={() => { setEditing(false); setActionError(''); }} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void saveEdit()} disabled={saving} className="btn-primary inline-flex items-center gap-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">Phone</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selected.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">Email</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selected.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">Institution</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selected.institution || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">MDA</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selected.mda || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeInfo className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">Designation</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selected.designation || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">Location</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selected.location_label?.replace(/\s*\(Entered by Admin\)$/i, '') || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-400">Check-in Time</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(selected.created_at).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {selected.method === 'manual' && (
                  <div className="border-t border-gray-100 px-5 py-4 dark:border-slate-700">
                    {confirmDelete ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-700 dark:text-slate-200">
                          Delete <strong className="text-gray-900 dark:text-white">{selected.full_name}</strong> from this event/session? This cannot be undone.
                        </p>
                        {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setConfirmDelete(false); setActionError(''); }} className="btn-secondary">
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete()}
                            disabled={deleting}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete attendee
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {actionError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={startEdit}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => { setConfirmDelete(true); setActionError(''); }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
