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
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: '#1A1714' }}>Respond</p>
        <p style={{ fontSize: '13px', color: '#6B6560' }}>Offer a word of encouragement or support.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('named')}
            className="flex-1 min-h-[44px] rounded-xl transition-opacity hover:opacity-80"
            style={{ background: '#EEF0FB', color: '#5B4FCF', fontWeight: 500, fontSize: '14px', border: '1px solid #C7D0F8' }}
          >
            Respond
          </button>
          <button
            onClick={() => setMode('anonymous')}
            className="flex-1 min-h-[44px] rounded-xl transition-opacity hover:opacity-80"
            style={{ background: '#F5F3EF', color: '#6B6560', fontWeight: 500, fontSize: '14px', border: '1px solid #E8E4DE' }}
          >
            Reply anonymously
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
      <p style={{ fontSize: '15px', fontWeight: 500, color: '#1A1714' }}>
        {mode === 'anonymous' ? 'Anonymous reply' : 'Your response'}
      </p>
      {mode === 'anonymous' && (
        <p style={{ fontSize: '12px', color: '#A8A29E' }}>Your name won&apos;t be shown.</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write something kind…"
        rows={4}
        className="w-full rounded-xl resize-none"
        style={{ background: '#F5F3EF', border: '1px solid #E8E4DE', padding: '12px 14px', fontSize: '15px', color: '#1A1714', lineHeight: 1.5 }}
      />
      {error && (
        <p className="rounded-xl px-3 py-2" style={{ fontSize: '13px', color: '#EF4444', background: '#FEF2F2' }}>{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => submit(mode === 'anonymous')}
          disabled={saving || !body.trim()}
          className="flex-1 min-h-[44px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 500, fontSize: '14px' }}
        >
          {saving ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => { setMode(null); setBody('') }}
          className="min-h-[44px] px-5 rounded-xl transition-opacity hover:opacity-80"
          style={{ background: '#F5F3EF', color: '#6B6560', fontWeight: 500, fontSize: '14px', border: '1px solid #E8E4DE' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
