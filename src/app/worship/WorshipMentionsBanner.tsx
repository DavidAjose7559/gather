'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Mention = {
  id: string
  type: 'note' | 'budget'
  event_id: string
  event_title: string
  poster_name: string
  excerpt: string
  category?: string
  created_at: string
}

export default function WorshipMentionsBanner() {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/worship/mentions')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMentions(data) })
      .finally(() => setLoading(false))
  }, [])

  async function dismiss(mention: Mention) {
    setMentions((prev) => prev.filter((m) => m.id !== mention.id))
    await fetch('/api/worship/mentions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mention.id, type: mention.type }),
    })
  }

  if (loading || mentions.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 20,
      border: '1px solid var(--border)',
      borderLeft: '3px solid #6C63FF',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6C63FF', display: 'inline-block', flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            You were mentioned {mentions.length === 1 ? 'in 1 place' : `in ${mentions.length} places`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {mentions.map((m, i) => (
          <div
            key={m.id}
            style={{
              padding: '12px 18px',
              borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6C63FF', marginBottom: 2 }}>
                {m.poster_name} mentioned you
                {m.type === 'budget' && m.category ? ` in ${m.category} budget note` : ' in a team note'}
                {' · '}
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{m.event_title}</span>
              </p>
              {m.excerpt && (
                <p style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {m.excerpt}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Link
                href={`/worship/${m.event_id}`}
                style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                View →
              </Link>
              <button
                onClick={() => dismiss(m)}
                style={{ fontSize: 16, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
