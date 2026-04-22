'use client'

import { useState } from 'react'
import type { WorshipGuest } from '@/lib/types'

type Category = 'speaker' | 'artist' | 'vip' | 'general'
type RsvpStatus = 'invited' | 'confirmed' | 'declined'

const categoryColors: Record<string, { bg: string; text: string }> = {
  speaker: { bg: 'rgba(108,99,255,0.15)', text: '#A09AF8' },
  artist: { bg: 'rgba(0,188,212,0.15)', text: '#00BCD4' },
  vip: { bg: 'rgba(255,149,0,0.15)', text: '#FF9500' },
  general: { bg: 'rgba(96,96,96,0.15)', text: '#909090' },
}

const rsvpColors: Record<RsvpStatus, { bg: string; text: string; label: string }> = {
  invited: { bg: 'rgba(255,149,0,0.15)', text: '#FF9500', label: 'Invited' },
  confirmed: { bg: 'rgba(76,175,80,0.15)', text: '#4CAF50', label: 'Confirmed' },
  declined: { bg: 'rgba(255,77,77,0.15)', text: '#FF4D4D', label: 'Declined' },
}

const RSVP_CYCLE: RsvpStatus[] = ['invited', 'confirmed', 'declined']

export default function GuestsTab({
  eventId,
  guests: initialGuests,
  onGuestsChange,
}: {
  eventId: string
  guests: WorshipGuest[]
  onGuestsChange: (g: WorshipGuest[]) => void
}) {
  const [guests, setGuestsState] = useState(initialGuests)
  const [filter, setFilter] = useState<'all' | Category>('all')
  const [addingGuest, setAddingGuest] = useState(false)
  const [newGuest, setNewGuest] = useState({ name: '', category: 'general', rsvp_status: 'invited', notes: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<WorshipGuest>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function updateLocal(items: WorshipGuest[]) {
    setGuestsState(items)
    onGuestsChange(items)
  }

  async function patchGuest(id: string, patch: Partial<WorshipGuest>) {
    setUpdatingId(id)
    const res = await fetch(`/api/worship/guests?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      updateLocal(guests.map((g) => (g.id === id ? { ...g, ...updated } : g)))
    }
    setUpdatingId(null)
  }

  async function cycleRsvp(guest: WorshipGuest) {
    const idx = RSVP_CYCLE.indexOf(guest.rsvp_status)
    const next = RSVP_CYCLE[(idx + 1) % RSVP_CYCLE.length]
    updateLocal(guests.map((g) => (g.id === guest.id ? { ...g, rsvp_status: next } : g)))
    await patchGuest(guest.id, { rsvp_status: next })
  }

  async function addGuest() {
    if (!newGuest.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/worship/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        name: newGuest.name.trim(),
        category: newGuest.category as Category,
        rsvp_status: newGuest.rsvp_status,
        notes: newGuest.notes.trim() || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      updateLocal([...guests, created])
      setNewGuest({ name: '', category: 'general', rsvp_status: 'invited', notes: '' })
      setAddingGuest(false)
    }
    setSaving(false)
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/worship/guests?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    if (res.ok) {
      const updated = await res.json()
      updateLocal(guests.map((g) => (g.id === id ? { ...g, ...updated } : g)))
    }
    setEditingId(null)
  }

  async function deleteGuest(id: string) {
    const res = await fetch(`/api/worship/guests?id=${id}`, { method: 'DELETE' })
    if (res.ok) updateLocal(guests.filter((g) => g.id !== id))
  }

  const confirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length
  const invited = guests.filter((g) => g.rsvp_status === 'invited').length
  const declined = guests.filter((g) => g.rsvp_status === 'declined').length

  const displayed = filter === 'all' ? guests : guests.filter((g) => g.category === filter)

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: active ? '#6C63FF' : 'var(--bg-input)',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Confirmed', value: confirmed, color: '#4CAF50' },
          { label: 'Invited', value: invited, color: '#FF9500' },
          { label: 'Declined', value: declined, color: '#FF4D4D' },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', backgroundColor: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'speaker', 'artist', 'vip', 'general'] as const).map((f) => (
          <button key={f} style={filterBtnStyle(filter === f)} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Guest list */}
      {displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            {filter === 'all' ? 'No guests added yet.' : `No ${filter}s added yet.`}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayed.map((guest) => {
          const cc = categoryColors[guest.category ?? 'general']
          const rc = rsvpColors[guest.rsvp_status]

          return (
            <div key={guest.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px' }}>
              {editingId === guest.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input style={inputStyle} value={editDraft.name ?? guest.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select style={inputStyle} value={editDraft.category ?? guest.category ?? 'general'} onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value as Category }))}>
                      <option value="speaker">Speaker</option>
                      <option value="artist">Artist</option>
                      <option value="vip">VIP</option>
                      <option value="general">General</option>
                    </select>
                    <select style={inputStyle} value={editDraft.rsvp_status ?? guest.rsvp_status} onChange={(e) => setEditDraft((d) => ({ ...d, rsvp_status: e.target.value as RsvpStatus }))}>
                      <option value="invited">Invited</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                  <input style={inputStyle} value={editDraft.notes ?? guest.notes ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value || null }))} placeholder="Notes" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveEdit(guest.id)} style={{ flex: 1, padding: '8px', borderRadius: 10, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '8px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{guest.name}</p>
                      {guest.category && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, backgroundColor: cc.bg, color: cc.text }}>
                          {guest.category}
                        </span>
                      )}
                    </div>
                    {guest.notes && <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{guest.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <button
                      onClick={() => cycleRsvp(guest)}
                      disabled={updatingId === guest.id}
                      title="Click to change RSVP status"
                      style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8, backgroundColor: rc.bg, color: rc.text, border: 'none', cursor: 'pointer', opacity: updatingId === guest.id ? 0.5 : 1, whiteSpace: 'nowrap' }}
                    >
                      {rc.label}
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditingId(guest.id); setEditDraft({}) }} style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                      <button onClick={() => deleteGuest(guest.id)} style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add guest form */}
      {addingGuest ? (
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus
              style={inputStyle}
              value={newGuest.name}
              onChange={(e) => setNewGuest((g) => ({ ...g, name: e.target.value }))}
              placeholder="Guest name"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select style={inputStyle} value={newGuest.category} onChange={(e) => setNewGuest((g) => ({ ...g, category: e.target.value }))}>
                <option value="general">General</option>
                <option value="speaker">Speaker</option>
                <option value="artist">Artist</option>
                <option value="vip">VIP</option>
              </select>
              <select style={inputStyle} value={newGuest.rsvp_status} onChange={(e) => setNewGuest((g) => ({ ...g, rsvp_status: e.target.value }))}>
                <option value="invited">Invited</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
              </select>
            </div>
            <input
              style={inputStyle}
              value={newGuest.notes}
              onChange={(e) => setNewGuest((g) => ({ ...g, notes: e.target.value }))}
              placeholder="Notes (optional)"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addGuest} disabled={saving || !newGuest.name.trim()} style={{ flex: 1, padding: '10px', borderRadius: 12, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {saving ? '…' : 'Add guest'}
              </button>
              <button onClick={() => { setAddingGuest(false); setNewGuest({ name: '', category: 'general', rsvp_status: 'invited', notes: '' }) }} style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingGuest(true)}
          style={{ padding: '12px', borderRadius: 14, backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-light)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          + Add guest
        </button>
      )}
    </div>
  )
}
