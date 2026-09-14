// components/admin/UserDetailActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trash2 } from 'lucide-react'

export default function UserDetailActions({
  adminId,
  adminName,
  isFirstLogin,
  canDelete,
}: {
  adminId: string
  adminName: string
  isFirstLogin: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/admins/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to delete admin.')
      router.replace('/users')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <p className="mr-auto text-xs font-medium text-gray-600 dark:text-slate-300">
          Permanently delete <span className="font-semibold">{adminName}</span>? This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        {error && <p className="w-full text-right text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isFirstLogin && (
        <span className="mr-auto inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800">
          Pending setup
        </span>
      )}
      {canDelete && (
        <button type="button" onClick={() => setConfirming(true)} className="btn-danger">
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      )}
      <Link href="/users" className="btn-secondary">
        Back to list
      </Link>
    </div>
  )
}
