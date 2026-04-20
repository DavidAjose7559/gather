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

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 20,
    border: '1px solid var(--border)',
    padding: 20,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 12,
    paddingBottom: 32,
  }

  if (mode === null) {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>Respond</h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Offer a word of encouragement or support.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setMode('named')}
            style={{ flex: 1, minHeight: 48, border: '1px solid #6C63FF', color: '#A09AF8', fontWeight: 500, borderRadius: 14, fontSize: 14, cursor: 'pointer', backgroundColor: 'rgba(108,99,255,0.1)' }}
          >
            Respond
          </button>
          <button
            onClick={() => setMode('anonymous')}
            style={{ flex: 1, minHeight: 48, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 500, borderRadius: 14, fontSize: 14, cursor: 'pointer', backgroundColor: 'var(--bg-base)' }}
          >
            Reply anonymously
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
        {mode === 'anonymous' ? 'Anonymous reply' : 'Your response'}
      </h2>
      {mode === 'anonymous' && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Your name won&apos;t be shown.</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write something kind…"
        rows={4}
        style={{ width: '100%', resize: 'none' }}
      />
      {error && (
        <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => submit(mode === 'anonymous')}
          disabled={saving || !body.trim()}
          style={{
            flex: 1,
            minHeight: 48,
            backgroundColor: '#6C63FF',
            color: 'var(--text-primary)',
            fontWeight: 700,
            borderRadius: 14,
            fontSize: 14,
            border: 'none',
            cursor: saving || !body.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !body.trim() ? 0.5 : 1,
          }}
        >
          {saving ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => { setMode(null); setBody('') }}
          style={{ minHeight: 48, padding: '0 16px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: 500, borderRadius: 14, fontSize: 14, border: 'none', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
