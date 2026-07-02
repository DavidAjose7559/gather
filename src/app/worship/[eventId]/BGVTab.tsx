'use client'

import { useState, useEffect } from 'react'
import type { WorshipEvent } from '@/lib/types'

type Singer = {
  id: string
  name: string
  voice_part: 'Soprano' | 'Alto' | 'Tenor' | 'Bass'
}

type Minister = {
  id: string
  name: string
  position: number
  singers: Singer[]
}

const voicePartColors: Record<string, string> = {
  Soprano: '#FF6B9D',
  Alto: '#FF9500',
  Tenor: '#4CAF50',
  Bass: '#6C63FF',
}

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'] as const

export default function BGVTab({
  event,
  onBgvShareTokenChange,
}: {
  event: WorshipEvent
  onBgvShareTokenChange: (token: string | null) => void
}) {
  const [ministers, setMinisters] = useState<Minister[]>([])
  const [loading, setLoading] = useState(true)
  const [addingMinister, setAddingMinister] = useState(false)
  const [newMinisterName, setNewMinisterName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingMinisterId, setEditingMinisterId] = useState<string | null>(null)
  const [editMinisterName, setEditMinisterName] = useState('')
  const [addingSingerId, setAddingSingerId] = useState<string | null>(null)
  const [newSinger, setNewSinger] = useState({ name: '', voice_part: 'Soprano' as Singer['voice_part'] })
  const [linkCopied, setLinkCopied] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [revokingLink, setRevokingLink] = useState(false)

  useEffect(() => {
    fetchMinisters()
  }, [event.id])

  async function fetchMinisters() {
    const res = await fetch(`/api/worship/bgv?event_id=${event.id}`)
    if (res.ok) {
      const data = await res.json()
      setMinisters(data)
    }
    setLoading(false)
  }

  async function addMinister() {
    if (!newMinisterName.trim()) return
    setSaving(true)
    const res = await fetch('/api/worship/bgv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, name: newMinisterName.trim() }),
    })
    if (res.ok) {
      const created = await res.json()
      setMinisters((prev) => [...prev, created])
      setNewMinisterName('')
      setAddingMinister(false)
    }
    setSaving(false)
  }

  async function updateMinister(id: string) {
    if (!editMinisterName.trim()) return
    const res = await fetch(`/api/worship/bgv?id=${id}&type=minister`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editMinisterName.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMinisters((prev) => prev.map((m) => (m.id === id ? { ...m, name: updated.name } : m)))
    }
    setEditingMinisterId(null)
    setEditMinisterName('')
  }

  async function deleteMinister(id: string) {
    const res = await fetch(`/api/worship/bgv?id=${id}&type=minister`, { method: 'DELETE' })
    if (res.ok) {
      setMinisters((prev) => prev.filter((m) => m.id !== id))
    }
  }

  async function addSinger(ministerId: string) {
    if (!newSinger.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/worship/bgv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minister_id: ministerId, name: newSinger.name.trim(), voice_part: newSinger.voice_part }),
    })
    if (res.ok) {
      const created = await res.json()
      setMinisters((prev) =>
        prev.map((m) => (m.id === ministerId ? { ...m, singers: [...m.singers, created] } : m))
      )
      setNewSinger({ name: '', voice_part: 'Soprano' })
      setAddingSingerId(null)
    }
    setSaving(false)
  }

  async function deleteSinger(ministerId: string, singerId: string) {
    const res = await fetch(`/api/worship/bgv?id=${singerId}&type=singer`, { method: 'DELETE' })
    if (res.ok) {
      setMinisters((prev) =>
        prev.map((m) => (m.id === ministerId ? { ...m, singers: m.singers.filter((s) => s.id !== singerId) } : m))
      )
    }
  }

  async function generateShareLink() {
    setGeneratingLink(true)
    const res = await fetch('/api/worship/bgv-share-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id }),
    })
    if (res.ok) {
      const { token } = await res.json()
      onBgvShareTokenChange(token)
    }
    setGeneratingLink(false)
  }

  async function revokeShareLink() {
    setRevokingLink(true)
    const res = await fetch(`/api/worship/bgv-share-token?event_id=${event.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      onBgvShareTokenChange(null)
    }
    setRevokingLink(false)
  }

  function copyShareLink() {
    if (!event.bgv_share_token) return
    const link = `${window.location.origin}/share/bgv/${event.bgv_share_token}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const shareLink = event.bgv_share_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/bgv/${event.bgv_share_token}` : ''

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

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Share section */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Share BGV Sheet</p>
        {!event.bgv_share_token ? (
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

      {/* Ministers list */}
      {ministers.length === 0 && !addingMinister && (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No ministers yet. Add a minister below.</p>
        </div>
      )}

      {ministers.map((minister) => (
        <div key={minister.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px' }}>
          {/* Minister header */}
          {editingMinisterId === minister.id ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                autoFocus
                style={{ ...inputStyle, flex: 1 }}
                value={editMinisterName}
                onChange={(e) => setEditMinisterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateMinister(minister.id)
                  if (e.key === 'Escape') { setEditingMinisterId(null); setEditMinisterName('') }
                }}
                placeholder="Minister name"
              />
              <button onClick={() => updateMinister(minister.id)} style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setEditingMinisterId(null); setEditMinisterName('') }} style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#6C63FF', margin: 0 }}>{minister.name}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditingMinisterId(minister.id); setEditMinisterName(minister.name) }} style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                <button onClick={() => deleteMinister(minister.id)} style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
              </div>
            </div>
          )}

          {/* Singers grouped by voice part */}
          {VOICE_PARTS.map((vp) => {
            const singers = minister.singers.filter((s) => s.voice_part === vp)
            if (singers.length === 0) return null
            return (
              <div key={vp} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: voicePartColors[vp], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{vp}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {singers.map((singer) => (
                    <span key={singer.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, backgroundColor: voicePartColors[vp] + '22', fontSize: 13, color: 'var(--text-primary)' }}>
                      {singer.name}
                      <button
                        onClick={() => deleteSinger(minister.id, singer.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Add singer form */}
          {addingSingerId === minister.id ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                autoFocus
                style={{ ...inputStyle, flex: 1 }}
                value={newSinger.name}
                onChange={(e) => setNewSinger((s) => ({ ...s, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') addSinger(minister.id) }}
                placeholder="Singer name"
              />
              <select
                style={{ ...selectStyle, width: 100 }}
                value={newSinger.voice_part}
                onChange={(e) => setNewSinger((s) => ({ ...s, voice_part: e.target.value as Singer['voice_part'] }))}
              >
                {VOICE_PARTS.map((vp) => (
                  <option key={vp} value={vp}>{vp}</option>
                ))}
              </select>
              <button onClick={() => addSinger(minister.id)} disabled={saving || !newSinger.name.trim()} style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {saving ? '…' : 'Add'}
              </button>
              <button onClick={() => { setAddingSingerId(null); setNewSinger({ name: '', voice_part: 'Soprano' }) }} style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSingerId(minister.id)}
              style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--bg-input)', border: '1px dashed var(--border-light)', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              + Add singer
            </button>
          )}
        </div>
      ))}

      {/* Add minister form */}
      {addingMinister ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            autoFocus
            value={newMinisterName}
            onChange={(e) => setNewMinisterName(e.target.value)}
            placeholder="Minister name"
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMinister()
              if (e.key === 'Escape') { setAddingMinister(false); setNewMinisterName('') }
            }}
          />
          <button
            onClick={addMinister}
            disabled={saving || !newMinisterName.trim()}
            style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {saving ? '…' : 'Add'}
          </button>
          <button
            onClick={() => { setAddingMinister(false); setNewMinisterName('') }}
            style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingMinister(true)}
          style={{ padding: '12px', borderRadius: 14, backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-light)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          + Add minister
        </button>
      )}
    </div>
  )
}
