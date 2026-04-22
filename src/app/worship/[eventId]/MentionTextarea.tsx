'use client'

import { useRef, useState } from 'react'
import type { WorshipTeamMember } from '@/lib/types'

export function renderWithMentions(text: string, team: WorshipTeamMember[]): React.ReactNode {
  if (!team.length || !text) return text

  const escaped = team.map((m) =>
    (m.display_name ?? m.full_name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  const pattern = new RegExp(`@(${escaped.join('|')})`, 'g')

  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <span key={match.index} style={{ color: '#6C63FF', fontWeight: 600 }}>
        {match[0]}
      </span>
    )
    last = pattern.lastIndex
  }

  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? <>{parts}</> : text
}

export default function MentionTextarea({
  value,
  onChange,
  onMentionedUsers,
  team,
  placeholder,
  minHeight = 72,
  style,
}: {
  value: string
  onChange: (v: string) => void
  onMentionedUsers: (ids: string[]) => void
  team: WorshipTeamMember[]
  placeholder?: string
  minHeight?: number
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [mentionedIds, setMentionedIds] = useState<string[]>([])

  const suggestions =
    query !== null
      ? team
          .filter((m) =>
            (m.display_name ?? m.full_name).toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
      : []

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    const before = e.target.value.slice(0, e.target.selectionStart)
    const match = before.match(/@([^@\n]*)$/)
    setQuery(match ? match[1] : null)
  }

  function pick(member: WorshipTeamMember) {
    const textarea = ref.current
    if (!textarea) return
    const cursor = textarea.selectionStart
    const before = value.slice(0, cursor).replace(/@[^@\n]*$/, '')
    const after = value.slice(cursor)
    const name = member.display_name ?? member.full_name
    onChange(`${before}@${name} ${after}`)
    setQuery(null)

    if (!mentionedIds.includes(member.id)) {
      const next = [...mentionedIds, member.id]
      setMentionedIds(next)
      onMentionedUsers(next)
    }
    setTimeout(() => textarea.focus(), 0)
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => { if (e.key === 'Escape') setQuery(null) }}
        placeholder={placeholder}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 14,
          resize: 'none',
          minHeight,
          outline: 'none',
          ...style,
        }}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 200,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          minWidth: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {suggestions.map((m) => (
            <button
              key={m.id}
              onMouseDown={(e) => { e.preventDefault(); pick(m) }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 14px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-primary)',
              }}
            >
              <span style={{ color: '#6C63FF', fontWeight: 600 }}>@</span>
              {m.display_name ?? m.full_name}
            </button>
          ))}
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '6px 14px', margin: 0 }}>
            Esc to dismiss
          </p>
        </div>
      )}
    </div>
  )
}
