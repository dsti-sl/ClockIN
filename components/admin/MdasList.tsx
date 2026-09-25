// components/admin/MdasList.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Eye, Search } from 'lucide-react'
import type { Mda } from '@/lib/types'

export default function MdasList({ mdas }: { mdas: Mda[] }) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = mdas.filter(m => m.name.toLowerCase().includes(q))

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center dark:border-slate-800">
        <h2 className="section-title">
          Items :
          <span className="ml-2 text-sm font-normal text-gray-400 dark:text-slate-400">
            {q ? `${filtered.length} of ${mdas.length}` : mdas.length}
          </span>
        </h2>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {mdas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
            <Building2 className="h-7 w-7 text-indigo-300 dark:text-indigo-500" />
          </div>
          <p className="font-medium text-gray-500 dark:text-slate-300">No MDAs yet</p>
          <Link href="/mdas/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Add your first MDA
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-gray-400 dark:text-slate-400">
          No MDAs match “{search}”.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 dark:divide-slate-800">
          {filtered.map((m, i) => (
            <li key={m.id}>
              <div className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <span className="w-7 flex-shrink-0 text-xs tabular-nums text-gray-400 dark:text-slate-500">
                  {i + 1}.
                </span>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400">
                    Added {new Date(m.created_at).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <Link
                  href={`/mdas/${m.id}`}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
