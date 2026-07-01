'use client'

import { useState } from 'react'
import type { WorshipOrderItem } from '@/lib/types'

export default function OrderTab({
  eventId,
  order: initialOrder,
  shareToken,
  onOrderChange,
  onShareTokenChange,
}: {
  eventId: string
  order: WorshipOrderItem[]
  shareToken: string | null
  onOrderChange: (o: WorshipOrderItem[]) => void
  onShareTokenChange: (token: string | null) => void
}) {
  const [items, setItems] = useState(initialOrder.map((o, i) => ({ ...o, position: i + 1 })))
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({ item: '', duration_minutes: '', assigned_to: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<WorshipOrderItem>>({})
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [revokingLink, setRevokingLink] = useState(false)

  function updateLocal(updated: WorshipOrderItem[]) {
    const reindexed = updated.map((o, i) => ({ ...o, position: i + 1 }))
    setItems(reindexed)
    onOrderChange(reindexed)
    return reindexed
  }

  async function moveItem(id: string, direction: 'up' | 'down') {
    setMovingId(id)
    const idx = items.findIndex((o) => o.id === id)
    if (direction === 'up' && idx === 0) { setMovingId(null); return }
    if (direction === 'down' && idx === items.length - 1) { setMovingId(null); return }

    const next = [...items]
    const swap = direction === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const reindexed = updateLocal(next)

    // Persist both swapped positions
    await fetch('/api/worship/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { id: reindexed[idx].id, position: reindexed[idx].position },
        { id: reindexed[swap].id, position: reindexed[swap].position },
      ]),
    })
    setMovingId(null)
  }

  async function addItem() {
    if (!newItem.item.trim()) return
    setSaving(true)
    const nextPos = items.length + 1
    const res = await fetch('/api/worship/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        item: newItem.item.trim(),
        duration_minutes: newItem.duration_minutes ? parseInt(newItem.duration_minutes) : null,
        assigned_to: newItem.assigned_to.trim() || null,
        notes: newItem.notes.trim() || null,
        position: nextPos,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      updateLocal([...items, { ...created, position: nextPos }])
      setNewItem({ item: '', duration_minutes: '', assigned_to: '', notes: '' })
      setAddingItem(false)
    }
    setSaving(false)
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/worship/order?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      const next = items.filter((o) => o.id !== id)
      updateLocal(next)
      // Re-persist all positions
      if (next.length > 0) {
        const reindexed = next.map((o, i) => ({ id: o.id, position: i + 1 }))
        await fetch('/api/worship/order', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reindexed),
        })
      }
    }
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/worship/order?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
    }
    setEditingId(null)
  }

  function copyOrder() {
    const lines = [
      'ORDER OF SERVICE',
      '================',
      ...items.map((o) => {
        let line = `${o.position}. ${o.item}`
        if (o.duration_minutes) line += ` (${o.duration_minutes} min)`
        if (o.assigned_to) line += ` — ${o.assigned_to}`
        if (o.notes) line += `\n   Note: ${o.notes}`
        return line
      }),
      '================',
      `Total: ${items.reduce((s, o) => s + (o.duration_minutes ?? 0), 0)} min`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function generateShareLink() {
    setGeneratingLink(true)
    const res = await fetch('/api/worship/share-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    if (res.ok) {
      const { token } = await res.json()
      onShareTokenChange(token)
    }
    setGeneratingLink(false)
  }

  async function revokeShareLink() {
    setRevokingLink(true)
    const res = await fetch(`/api/worship/share-token?event_id=${eventId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      onShareTokenChange(null)
    }
    setRevokingLink(false)
  }

  function copyShareLink() {
    if (!shareToken) return
    const link = `${window.location.origin}/share/order/${shareToken}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const shareLink = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/order/${shareToken}` : ''

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Share section */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Share Order of Service</p>
        {!shareToken ? (
          <button
            onClick={generateShareLink}
            disabled={generatingLink}
            style={{ padding: '10px 16px', borderRadius: 10, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {generatingLink ? '...' : '🔗 Generate share link'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              readOnly
              value={shareLink}
              style={{ ...inputStyle, backgroundColor: 'var(--bg-base)', cursor: 'text' }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={copyShareLink}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
              <button
                onClick={revokeShareLink}
                disabled={revokingLink}
                style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: '#FF4D4D', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                {revokingLink ? '...' : 'Revoke link'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          {items.length} items · {items.reduce((s, o) => s + (o.duration_minutes ?? 0), 0)} min total
        </p>
        <button
          onClick={copyOrder}
          style={{ fontSize: 13, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          {copied ? 'Copied!' : 'Copy order'}
        </button>
      </div>

      {items.length === 0 && !addingItem && (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No items yet. Add the first item below.</p>
        </div>
      )}

      {items.map((item, idx) => (
        <div key={item.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px' }}>
          {editingId === item.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                style={inputStyle}
                value={editDraft.item ?? item.item}
                onChange={(e) => setEditDraft((d) => ({ ...d, item: e.target.value }))}
                placeholder="Item name"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  type="number"
                  style={inputStyle}
                  value={editDraft.duration_minutes ?? item.duration_minutes ?? ''}
                  onChange={(e) => setEditDraft((d) => ({ ...d, duration_minutes: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="Duration (min)"
                />
                <input
                  style={inputStyle}
                  value={editDraft.assigned_to ?? item.assigned_to ?? ''}
                  onChange={(e) => setEditDraft((d) => ({ ...d, assigned_to: e.target.value || null }))}
                  placeholder="Assigned to"
                />
              </div>
              <input
                style={inputStyle}
                value={editDraft.notes ?? item.notes ?? ''}
                onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value || null }))}
                placeholder="Notes"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit(item.id)} style={{ flex: 1, padding: '8px', borderRadius: 10, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '8px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Position number */}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 20, paddingTop: 2 }}>
                {item.position}
              </span>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.item}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {item.duration_minutes && (
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{item.duration_minutes} min</span>
                  )}
                  {item.assigned_to && (
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.assigned_to}</span>
                  )}
                  {item.notes && (
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{item.notes}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={idx === 0 || movingId === item.id}
                    style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'var(--bg-input)', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={idx === items.length - 1 || movingId === item.id}
                    style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'var(--bg-input)', border: 'none', cursor: idx === items.length - 1 ? 'default' : 'pointer', opacity: idx === items.length - 1 ? 0.3 : 1, fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ↓
                  </button>
                </div>
                <button onClick={() => { setEditingId(item.id); setEditDraft({}) }} style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                <button onClick={() => deleteItem(item.id)} style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Del</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add item form */}
      {addingItem ? (
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus
              style={inputStyle}
              value={newItem.item}
              onChange={(e) => setNewItem((n) => ({ ...n, item: e.target.value }))}
              placeholder="Item name (e.g. Worship, Message, Prayer)"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                type="number"
                style={inputStyle}
                value={newItem.duration_minutes}
                onChange={(e) => setNewItem((n) => ({ ...n, duration_minutes: e.target.value }))}
                placeholder="Duration (min)"
              />
              <input
                style={inputStyle}
                value={newItem.assigned_to}
                onChange={(e) => setNewItem((n) => ({ ...n, assigned_to: e.target.value }))}
                placeholder="Assigned to"
              />
            </div>
            <input
              style={inputStyle}
              value={newItem.notes}
              onChange={(e) => setNewItem((n) => ({ ...n, notes: e.target.value }))}
              placeholder="Notes"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addItem} disabled={saving || !newItem.item.trim()} style={{ flex: 1, padding: '10px', borderRadius: 12, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {saving ? '…' : 'Add item'}
              </button>
              <button onClick={() => { setAddingItem(false); setNewItem({ item: '', duration_minutes: '', assigned_to: '', notes: '' }) }} style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          style={{ padding: '12px', borderRadius: 14, backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-light)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          + Add item
        </button>
      )}
    </div>
  )
}
