// app/(admin)/mdas/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewMdaPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [form,    setForm]    = useState({ name: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('MDA name is required.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('mdas')
        .insert({
          name:       form.name.trim(),
          created_by: user.id,
        })

      if (insertError) throw new Error(insertError.message)

      router.push('/mdas')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link href="/mdas" className="btn-ghost p-2"><ChevronLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold">Add MDA</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">MDA name *</label>
          <input required className="input-base" placeholder="Ministry of Education"
            value={form.name} onChange={e => setForm({ name: e.target.value })} />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add MDA'}
        </button>
      </form>
    </div>
  )
}
