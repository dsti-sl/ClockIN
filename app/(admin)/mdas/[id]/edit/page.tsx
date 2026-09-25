// app/(admin)/mdas/[id]/edit/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditMdaPage() {
  const { id }     = useParams<{ id: string }>()
  const router     = useRouter()
  const supabase   = createClient()

  const [form,    setForm]    = useState({ name: '', is_active: true })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from('mdas')
        .select('name, is_active')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('MDA not found.')
      } else {
        setForm({ name: data.name, is_active: data.is_active })
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('MDA name is required.')
      return
    }

    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('mdas')
        .update({ name: form.name.trim(), is_active: form.is_active })
        .eq('id', id)

      if (updateError) throw new Error(updateError.message)

      router.push(`/mdas/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link href={`/mdas/${id}`} className="btn-ghost p-2"><ChevronLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold">Edit MDA</h1>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label">MDA name *</label>
            <input required className="input-base" placeholder="Ministry of Education"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </button>
        </form>
      )}
    </div>
  )
}
