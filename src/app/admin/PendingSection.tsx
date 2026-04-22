'use client'

import { useState } from 'react'

type PendingUser = {
  id: string
  full_name: string
  display_name: string | null
  email: string | null
}

const ACCESS_OPTIONS = [
  { value: 'gather', label: 'Gather member' },
  { value: 'worship_only', label: 'Worship planner only' },
  { value: 'both', label: 'Both (Gather + Worship)' },
  { value: 'admin', label: 'Admin' },
]

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

export default function PendingSection({ initialPending }: { initialPending: PendingUser[] }) {
  const [pending, setPending] = useState(initialPending)
  const [expanded, setExpanded] = useState(initialPending.length > 0)
  const [accessTypes, setAccessTypes] = useState<Record<string, string>>(
    Object.fromEntries(initialPending.map((u) => [u.id, 'gather']))
  )
  const [approvingId, setApprovingId] = useState<string | null>(null)

  if (pending.length === 0) return null

  async function approve(userId: string) {
    setApprovingId(userId)
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, accessType: accessTypes[userId] ?? 'gather' }),
    })
    if (res.ok) {
      setPending((prev) => prev.filter((u) => u.id !== userId))
    }
    setApprovingId(null)
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid rgba(255,149,0,0.3)', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF9500', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Pending approval
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: 'rgba(255,149,0,0.15)',
            color: '#FF9500',
            borderRadius: 6,
            padding: '2px 8px',
          }}>
            {pending.length}
          </span>
        </div>
        <span style={{ fontSize: 18, color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>
          ↓
        </span>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {pending.map((user, i) => {
            const name = user.display_name ?? user.full_name
            const avatarColor = getAvatarColor(user.full_name)
            const initials = user.full_name.trim().split(' ').length >= 2
              ? `${user.full_name.trim().split(' ')[0][0]}${user.full_name.trim().split(' ').at(-1)![0]}`
              : user.full_name.slice(0, 2)

            return (
              <div
                key={user.id}
                style={{
                  padding: '14px 20px',
                  borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  {user.email && (
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  )}
                  <select
                    value={accessTypes[user.id] ?? 'gather'}
                    onChange={(e) => setAccessTypes((prev) => ({ ...prev, [user.id]: e.target.value }))}
                    style={{
                      marginTop: 8,
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 13,
                      outline: 'none',
                      width: '100%',
                      maxWidth: 220,
                    }}
                  >
                    {ACCESS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => approve(user.id)}
                  disabled={approvingId === user.id}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    backgroundColor: '#4CAF50',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: approvingId === user.id ? 'not-allowed' : 'pointer',
                    opacity: approvingId === user.id ? 0.6 : 1,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {approvingId === user.id ? '…' : 'Approve'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
