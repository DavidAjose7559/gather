'use client'

import { useState } from 'react'
import type { WorshipEvent, WorshipNoteWithCreator } from '@/lib/types'

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function OverviewTab({
  event,
  notes,
  onEventUpdate,
  onNoteAdd,
  onNoteDelete,
}: {
  event: WorshipEvent
  notes: WorshipNoteWithCreator[]
  onEventUpdate: (e: WorshipEvent) => void
  onNoteAdd: (n: WorshipNoteWithCreator) => void
  onNoteDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: event.title,
    event_date: event.event_date,
    venue: event.venue ?? '',
    expected_guests: event.expected_guests?.toString() ?? '',
    theme: event.theme ?? '',
    status: event.status,
    notes: event.notes ?? '',
  })

  const [noteBody, setNoteBody] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
  }

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 6,
    display: 'block',
  }

  async function saveEvent() {
    setSaving(true)
    const res = await fetch(`/api/worship/events?id=${event.id}`, {
      method: 'PATCH',
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
    if (res.ok) {
      const updated = await res.json()
      onEventUpdate(updated)
      setEditing(false)
    }
    setSaving(false)
  }

  async function postNote() {
    if (!noteBody.trim()) return
    setPostingNote(true)
    const res = await fetch('/api/worship/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, body: noteBody.trim() }),
    })
    if (res.ok) {
      const note = await res.json()
      onNoteAdd(note)
      setNoteBody('')
    }
    setPostingNote(false)
  }

  async function deleteNote(id: string) {
    setDeletingNoteId(id)
    const res = await fetch(`/api/worship/notes?id=${id}`, { method: 'DELETE' })
    if (res.ok) onNoteDelete(id)
    setDeletingNoteId(null)
  }

  const infoRow = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <span style={fieldLabelStyle}>{label}</span>
        <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>{value}</p>
      </div>
    ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Event details card */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Event details</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ fontSize: 13, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={fieldLabelStyle}>Title</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={fieldLabelStyle}>Date</label>
                <input type="date" style={inputStyle} value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as WorshipEvent['status'] }))}>
                  <option value="planning">Planning</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={fieldLabelStyle}>Venue</label>
                <input style={inputStyle} value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Location" />
              </div>
              <div>
                <label style={fieldLabelStyle}>Expected guests</label>
                <input type="number" style={inputStyle} value={form.expected_guests} onChange={(e) => setForm((f) => ({ ...f, expected_guests: e.target.value }))} min="0" />
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Theme</label>
              <input style={inputStyle} value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} placeholder="e.g. Surrender, Encounter…" />
            </div>
            <div>
              <label style={fieldLabelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Event notes…"
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveEvent}
                disabled={saving}
                style={{ flex: 1, padding: '12px', borderRadius: 12, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => { setEditing(false); setForm({ title: event.title, event_date: event.event_date, venue: event.venue ?? '', expected_guests: event.expected_guests?.toString() ?? '', theme: event.theme ?? '', status: event.status, notes: event.notes ?? '' }) }}
                style={{ padding: '12px 20px', borderRadius: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {infoRow('Venue', event.venue)}
            {event.expected_guests != null && infoRow('Expected guests', String(event.expected_guests))}
            {infoRow('Theme', event.theme)}
            {infoRow('Notes', event.notes)}
            {!event.venue && !event.theme && !event.notes && event.expected_guests == null && (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No additional details added yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Team notes */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Team notes</h2>

        {/* Add note */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Post a note or announcement for the team…"
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              resize: 'none',
              minHeight: 72,
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote()
            }}
          />
          <button
            onClick={postNote}
            disabled={postingNote || !noteBody.trim()}
            style={{
              padding: '0 16px',
              borderRadius: 12,
              backgroundColor: '#6C63FF',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 14,
              cursor: postingNote || !noteBody.trim() ? 'not-allowed' : 'pointer',
              opacity: !noteBody.trim() ? 0.4 : postingNote ? 0.7 : 1,
              alignSelf: 'flex-end',
              height: 44,
              whiteSpace: 'nowrap',
            }}
          >
            {postingNote ? '…' : 'Post'}
          </button>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No notes yet — post one to keep the team informed.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map((note) => (
              <div key={note.id} style={{ backgroundColor: 'var(--bg-card-2)', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{note.creator_name}</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{timeAgo(note.created_at)}</span>
                    <button
                      onClick={() => deleteNote(note.id)}
                      disabled={deletingNoteId === note.id}
                      style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', opacity: deletingNoteId === note.id ? 0.5 : 1, padding: 0 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{note.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
