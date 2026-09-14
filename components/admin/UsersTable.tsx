// components/admin/UsersTable.tsx
'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
} from 'lucide-react'
import type { Profile } from '@/lib/types'
import { isOnline } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'inactive'
type RoleFilter   = 'all' | 'super' | 'admin'

export default function UsersTable({ users }: { users: Profile[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [roleFilter,   setRoleFilter]   = useState<RoleFilter>('all')
  const [page,         setPage]         = useState(0)
  const [perPage,      setPerPage]      = useState(10)

  // Re-render every minute so Online badges stay fresh without refetching
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const filtered = users.filter(u => {
    if (statusFilter === 'active'   && !u.is_active)    return false
    if (statusFilter === 'inactive' &&  u.is_active)    return false
    if (roleFilter   === 'super'    && !u.is_super_admin) return false
    if (roleFilter   === 'admin'    &&  u.is_super_admin) return false

    if (!search) return true
    const q = search.toLowerCase()
    return (
      (u.full_name   ?? '').toLowerCase().includes(q) ||
       u.email.toLowerCase().includes(q) ||
      (u.institution ?? '').toLowerCase().includes(q) ||
      (u.designation ?? '').toLowerCase().includes(q) ||
      (u.phone       ?? '').toLowerCase().includes(q) ||
      mdaName(u).toLowerCase().includes(q)
    )
  })

  const totalPages  = Math.ceil(filtered.length / perPage)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const paginated   = filtered.slice(currentPage * perPage, (currentPage + 1) * perPage)

  const perPageOptions = [5, 10, 15, 25, 50]

  function mdaName(u: Profile): string {
    const m = u.mda
    if (Array.isArray(m)) return m[0]?.name ?? ''
    return m?.name ?? ''
  }

  function refresh() {
    startTransition(() => router.refresh())
  }

  const selectClass =
    'rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 dark:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 transition-colors'

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-slate-800">
        <h2 className="section-title">
          Accounts :
          <span className="ml-2 text-sm font-normal text-gray-400 dark:text-slate-400">
            {search || statusFilter !== 'all' || roleFilter !== 'all'
              ? `${filtered.length} of ${users.length}`
              : users.length}
          </span>
        </h2>
        <button
          onClick={refresh}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-2 sm:flex-row sm:items-center dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name, email, MDA…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as StatusFilter); setPage(0) }}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value as RoleFilter); setPage(0) }}
            className={selectClass}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="super">Super admins</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-slate-400">
          {users.length === 0
            ? 'No admin accounts yet.'
            : 'No accounts match your search or filters.'}
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on small screens */}
          <div className="hidden w-full overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="w-10 px-4 py-2.5 text-left">#</th>
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">Email</th>
                  <th className="px-4 py-2.5 text-left">MDA</th>
                  <th className="px-4 py-2.5 text-left">Designation</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-center w-16">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {paginated.map((u, i) => (
                  <tr
                    key={u.id}
                    onClick={() => router.push(`/users/${u.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-2.5 text-gray-400 tabular-nums dark:text-slate-400">{currentPage * perPage + i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                      {u.full_name || '—'}
                      {isOnline(u.last_seen_at) && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-800"
                          title="Active in the last 5 minutes"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Online
                        </span>
                      )}
                      {u.is_first_login && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800">
                          Pending setup
                        </span>
                      )}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-gray-500 dark:text-slate-300">{u.email}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-gray-500 dark:text-slate-300">{mdaName(u) || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-slate-300">{u.designation || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                        <span className={`text-xs font-medium ${u.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          router.push(`/users/${u.id}`)
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 dark:text-slate-300 hover:bg-gray-100 hover:text-gray-700 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
                        title="View admin"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — shown only on small screens */}
          <div className="divide-y divide-gray-100 lg:hidden dark:divide-slate-800">
            {paginated.map((u, i) => (
              <div
                key={u.id}
                onClick={() => router.push(`/users/${u.id}`)}
                className="cursor-pointer space-y-1.5 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex-shrink-0 text-xs tabular-nums text-gray-400 dark:text-slate-400">{currentPage * perPage + i + 1}.</span>
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{u.full_name || u.email}</span>
                    {isOnline(u.last_seen_at) && (
                      <span
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-800"
                        title="Active in the last 5 minutes"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Online
                      </span>
                    )}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      router.push(`/users/${u.id}`)
                    }}
                    className="flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 dark:text-slate-300 hover:bg-gray-100 hover:text-gray-700 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
                    title="View admin"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="truncate text-xs text-gray-500 dark:text-slate-300">{u.email}</p>
                {(mdaName(u) || u.designation) && (
                  <p className="truncate text-xs text-gray-500 dark:text-slate-300">
                    {[mdaName(u), u.designation].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                    <span className={`font-medium ${u.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                  {u.is_first_login && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800">
                      Pending setup
                    </span>
                  )}
                </div>
              </div>
            ))}
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
              className={selectClass}
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
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
