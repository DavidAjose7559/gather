'use client'

import { useState } from 'react'

const DEFAULT_MESSAGE = `Hey everyone 🙏🏾\n\nJust a reminder to check in on Gather today. It only takes a minute and it means a lot to the group to know how you're doing.\n\n→ gatherdaily.app`

export default function ReminderForm({ memberCount }: { memberCount: number }) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendReminders() {
    setSending(true)
    setError(null)
    setResult(null)
    const res = await fetch('/api/admin/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to send')
    } else {
      setResult(data)
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={!!result}
        rows={6}
        style={{
          width: '100%',
          resize: 'vertical',
          minHeight: 120,
          backgroundColor: 'var(--bg-card-2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: 'system-ui, sans-serif',
          outline: 'none',
          opacity: result ? 0.5 : 1,
        }}
      />
      {result ? (
        <div style={{ backgroundColor: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 12, padding: '10px 14px' }}>
          <p style={{ fontSize: 14, color: '#4CAF50', fontWeight: 500 }}>
            {result.sent === 0
              ? 'Everyone has already checked in today.'
              : `Reminder sent to ${result.sent} member${result.sent === 1 ? '' : 's'}.`}
          </p>
        </div>
      ) : null}
      {error && (
        <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
      )}
      <button
        onClick={sendReminders}
        disabled={sending || !!result || !message.trim()}
        style={{
          width: '100%',
          minHeight: 48,
          backgroundColor: sending || result ? 'rgba(108,99,255,0.3)' : 'rgba(108,99,255,0.15)',
          color: sending || result ? 'rgba(160,154,248,0.5)' : '#A09AF8',
          fontWeight: 600,
          fontSize: 15,
          borderRadius: 12,
          border: '1px solid rgba(108,99,255,0.2)',
          cursor: sending || result || !message.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        {sending ? 'Sending…' : result ? 'Sent ✓' : 'Send check-in reminder'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        Only members who haven&apos;t checked in today and have reminders enabled will receive this.
      </p>
    </div>
  )
}
