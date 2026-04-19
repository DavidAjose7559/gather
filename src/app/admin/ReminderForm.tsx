'use client'

import { useState } from 'react'

export default function ReminderForm({ memberCount }: { memberCount: number }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendReminders() {
    setSending(true)
    setError(null)
    setResult(null)
    const res = await fetch('/api/admin/remind', { method: 'POST' })
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
        disabled={sending || !!result}
        style={{
          width: '100%',
          minHeight: 48,
          backgroundColor: sending || result ? 'rgba(108,99,255,0.3)' : 'rgba(108,99,255,0.15)',
          color: sending || result ? 'rgba(160,154,248,0.5)' : '#A09AF8',
          fontWeight: 600,
          fontSize: 15,
          borderRadius: 12,
          border: '1px solid rgba(108,99,255,0.2)',
          cursor: sending || result ? 'not-allowed' : 'pointer',
        }}
      >
        {sending ? 'Sending…' : result ? 'Sent ✓' : `Send check-in reminder`}
      </button>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
        Only members who haven&apos;t checked in today and have reminders enabled will receive this.
      </p>
    </div>
  )
}
