'use client'

import { useState } from 'react'

type ResponseItem = {
  id: string
  body: string
  is_anonymous: boolean
  created_at: string
  responderName: string | null
  parent_id: string | null
}

function formatTime(createdAt: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(createdAt))
}

export default function ResponseThread({
  initialResponses,
  checkInId,
  currentUserId,
}: {
  initialResponses: ResponseItem[]
  checkInId: string
  currentUserId: string
}) {
  const [responses, setResponses] = useState(initialResponses)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyAnon, setReplyAnon] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const topLevel = responses.filter((r) => !r.parent_id)
  const getReplies = (id: string) => responses.filter((r) => r.parent_id === id)

  function openReply(id: string) {
    setReplyingTo(id)
    setReplyText('')
    setReplyAnon(false)
  }

  async function submitReply(parentId: string) {
    if (!replyText.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        check_in_id: checkInId,
        responder_id: currentUserId,
        body: replyText.trim(),
        is_anonymous: replyAnon,
        parent_id: parentId,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setResponses((prev) => [
        ...prev,
        {
          id: data.id,
          body: replyText.trim(),
          is_anonymous: replyAnon,
          created_at: new Date().toISOString(),
          responderName: replyAnon ? null : 'You',
          parent_id: parentId,
        },
      ])
      setReplyText('')
      setReplyAnon(false)
      setReplyingTo(null)
    }
    setSubmitting(false)
  }

  if (topLevel.length === 0) {
    return (
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', paddingLeft: 4 }}>
        No responses yet. Be the first to encourage.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {topLevel.map((r) => {
        const replies = getReplies(r.id)
        const isReplying = replyingTo === r.id

        return (
          <div key={r.id}>
            {/* Response card */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: 16, border: '1px solid #2A2A2A', padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                {r.responderName ?? 'A member of your group'} · {formatTime(r.created_at)}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>{r.body}</p>
              <button
                onClick={() => isReplying ? setReplyingTo(null) : openReply(r.id)}
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 0', minHeight: 32, display: 'block' }}
              >
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            </div>

            {/* Existing replies */}
            {replies.length > 0 && (
              <div style={{ marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid #2A2A2A', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {replies.map((reply) => (
                  <div key={reply.id} style={{ backgroundColor: '#141414', borderRadius: 12, border: '1px solid #222222', padding: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                      {reply.responderName ?? 'A member'} · {formatTime(reply.created_at)}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>{reply.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Inline reply form */}
            {isReplying && (
              <div style={{ marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid rgba(108,99,255,0.3)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  rows={3}
                  autoFocus
                  style={{ width: '100%', resize: 'none' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={replyAnon}
                    onChange={(e) => setReplyAnon(e.target.checked)}
                    style={{ accentColor: '#6C63FF', width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Reply anonymously</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => submitReply(r.id)}
                    disabled={submitting || !replyText.trim()}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: '#6C63FF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 18px',
                      cursor: submitting || !replyText.trim() ? 'not-allowed' : 'pointer',
                      opacity: submitting || !replyText.trim() ? 0.5 : 1,
                      minHeight: 36,
                    }}
                  >
                    {submitting ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
