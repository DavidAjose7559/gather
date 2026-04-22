'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewEventPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    event_date: '',
    venue: '',
    expected_guests: '',
    theme: '',
    status: 'planning',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.event_date) {
      setError('Title and date are required.')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/worship/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        event_date: form.event_date,
        venue: form.venue.trim() || null,
        expected_guests: form.expected_guests ? parseInt(form.expected_guests) : null,
        theme: form.theme.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setSaving(false)
      return
    }

    router.push(`/worship/${data.id}`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '32px 20px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link href="/worship" style={{ fontSize: 14, color: 'var(--text-tertiary)', textDecoration: 'none', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>New worship night</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div>
            <label style={labelStyle}>Event name *</label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Time with Jesus — May Night"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                style={inputStyle}
                value={form.event_date}
                onChange={(e) => set('event_date', e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="planning">Planning</option>
                <option value="confirmed">Confirmed</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Venue</label>
              <input
                style={inputStyle}
                value={form.venue}
                onChange={(e) => set('venue', e.target.value)}
                placeholder="Location"
              />
            </div>
            <div>
              <label style={labelStyle}>Expected guests</label>
              <input
                type="number"
                style={inputStyle}
                value={form.expected_guests}
                onChange={(e) => set('expected_guests', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Theme / vision</label>
            <input
              style={inputStyle}
              value={form.theme}
              onChange={(e) => set('theme', e.target.value)}
              placeholder="e.g. Surrender, Encounter, etc."
            />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any initial thoughts or context…"
            />
          </div>

          {error && (
            <p style={{ fontSize: 14, color: '#FF4D4D', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '14px 24px',
              borderRadius: 14,
              backgroundColor: saving ? '#4a4580' : '#6C63FF',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {saving ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  )
}
