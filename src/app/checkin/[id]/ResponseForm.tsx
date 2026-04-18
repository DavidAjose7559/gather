'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResponseForm({ checkInId, currentUserId }: { checkInId: string; currentUserId: string }) {
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
      body: JSON.stringify({ check_in_id: checkInId, responder_id: currentUserId, body: body.trim(), is_anonymous: anonymous }),
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
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Leave a response</p>
        <p style={{ fontSize: '13px', color: '#A0A0A0' }}>Offer a word of encouragement or support.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('named')}
            className="flex-1 min-h-[48px] rounded-xl transition-opacity hover:opacity-80"
            style={{ background: '#6C63FF', color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}
          >
            Respond
          </button>
          <button
            onClick={() => setMode('anonymous')}
            className="flex-1 min-h-[48px] rounded-xl transition-opacity hover:opacity-80"
            style={{ background: '#2A2A2A', color: '#A0A0A0', fontWeight: 500, fontSize: '14px', border: '1px solid #333333' }}
          >
            Reply anonymously
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
        {mode === 'anonymous' ? 'Anonymous reply' : 'Your response'}
      </p>
      {mode === 'anonymous' && (
        <p style={{ fontSize: '12px', color: '#606060' }}>Your name won&apos;t be shown.</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write something kind…"
        rows={4}
        className="w-full resize-none"
        style={{ padding: '14px 16px', fontSize: '15px', lineHeight: 1.5, borderRadius: '12px' }}
      />
      {error && (
        <p className="rounded-xl px-4 py-3" style={{ fontSize: '13px', color: '#FF4D4D', background: '#2E1212', border: '1px solid #4A1F1F' }}>{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => submit(mode === 'anonymous')}
          disabled={saving || !body.trim()}
          className="flex-1 min-h-[48px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#6C63FF', fontWeight: 600, fontSize: '15px' }}
        >
          {saving ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => { setMode(null); setBody('') }}
          className="min-h-[48px] px-5 rounded-xl transition-opacity hover:opacity-80"
          style={{ background: '#2A2A2A', color: '#A0A0A0', fontWeight: 500, fontSize: '14px', border: '1px solid #333333' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
