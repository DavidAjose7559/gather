'use client'

import { useState } from 'react'

export default function BroadcastForm({ memberCount }: { memberCount: number }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setSending(true)
    setError(null)
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to send')
      setConfirming(false)
    } else {
      setResult(data)
      setSubject('')
      setMessage('')
      setConfirming(false)
    }
    setSending(false)
  }

  if (result) {
    return (
      <div style={{ backgroundColor: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <p style={{ fontSize: 14, color: '#4CAF50', fontWeight: 600 }}>
          Message sent to {result.sent} members
        </p>
        <button
          onClick={() => setResult(null)}
          style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject line…"
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message here…"
          rows={5}
          style={{ width: '100%', resize: 'none', minHeight: 120 }}
        />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
          {message.length} characters
        </p>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={!subject.trim() || !message.trim()}
          style={{
            width: '100%',
            minHeight: 48,
            backgroundColor: '#6C63FF',
            color: 'white',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 12,
            border: 'none',
            cursor: !subject.trim() || !message.trim() ? 'not-allowed' : 'pointer',
            opacity: !subject.trim() || !message.trim() ? 0.4 : 1,
          }}
        >
          Send to all members
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', backgroundColor: '#111111', borderRadius: 12, padding: '12px 16px', lineHeight: 1.5 }}>
            This will send an email to all {memberCount} members. Are you sure?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={send}
              disabled={sending}
              style={{ flex: 1, minHeight: 48, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, fontSize: 15, borderRadius: 12, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.5 : 1 }}
            >
              {sending ? 'Sending…' : 'Yes, send it'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={sending}
              style={{ minHeight: 48, padding: '0 20px', backgroundColor: '#2A2A2A', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 14, borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
