'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResponseForm({
  checkInId,
  currentUserId,
}: {
  checkInId: string
  currentUserId: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'named' | 'anonymous' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(anonymous: boolean) {
    if (!body.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        check_in_id: checkInId,
        responder_id: currentUserId,
        body: body.trim(),
        is_anonymous: anonymous,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save response')
      setSaving(false)
      return
    }

    setBody('')
    setMode(null)
    setSaving(false)
    router.refresh()
  }

  if (mode === null) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3 pb-8">
        <h2 className="font-semibold text-gray-900">Respond</h2>
        <p className="text-sm text-gray-500">Offer a word of encouragement or support.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('named')}
            className="flex-1 min-h-[48px] border border-indigo-200 text-indigo-700 font-medium rounded-xl text-sm hover:bg-indigo-50 transition-all"
          >
            Respond
          </button>
          <button
            onClick={() => setMode('anonymous')}
            className="flex-1 min-h-[48px] border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-all"
          >
            Reply anonymously
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3 pb-8">
      <h2 className="font-semibold text-gray-900">
        {mode === 'anonymous' ? 'Anonymous reply' : 'Your response'}
      </h2>
      {mode === 'anonymous' && (
        <p className="text-xs text-gray-400">Your name won't be shown.</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write something kind…"
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => submit(mode === 'anonymous')}
          disabled={saving || !body.trim()}
          className="flex-1 min-h-[48px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl text-sm hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => { setMode(null); setBody('') }}
          className="min-h-[48px] px-4 bg-gray-100 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
