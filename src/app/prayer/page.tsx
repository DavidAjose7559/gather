'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

type PrayerProfile = { full_name: string; display_name: string | null; is_demo?: boolean | null }

type Comment = {
  id: string
  body: string
  user_id: string
  created_at: string
  profile: PrayerProfile | null
}

type PrayerItem = {
  id: string
  user_id: string
  body: string
  is_answered: boolean
  answered_note: string | null
  praying_count: number
  created_at: string
  answered_at: string | null
  profile: PrayerProfile | null
  comments: Comment[]
}

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2)
  const color = getAvatarColor(name)
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0, textTransform: 'uppercase' }}>
      {initials}
    </div>
  )
}

export default function PrayerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [active, setActive] = useState<PrayerItem[]>([])
  const [answered, setAnswered] = useState<PrayerItem[]>([])
  const [myPrayingIds, setMyPrayingIds] = useState<Set<string>>(new Set())
  const [showTestimonies, setShowTestimonies] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add request form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBody, setNewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mark as answered flow
  const [markingAnsweredId, setMarkingAnsweredId] = useState<string | null>(null)
  const [answerNote, setAnswerNote] = useState('')

  // Remove confirmation
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  // Encouragement comment
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [commentBody, setCommentBody] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [profileRes, activeRes, answeredRes, prayingRes] = await Promise.all([
        supabase.from('profiles').select('role, is_demo').eq('id', user.id).single(),
        supabase
          .from('prayer_requests')
          .select('*, profile:profiles(full_name, display_name, is_demo), comments:prayer_comments(id, body, user_id, created_at, profile:profiles(full_name, display_name))')
          .eq('is_answered', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('prayer_requests')
          .select('*, profile:profiles(full_name, display_name, is_demo), comments:prayer_comments(id, body, user_id, created_at, profile:profiles(full_name, display_name))')
          .eq('is_answered', true)
          .order('answered_at', { ascending: false }),
        supabase
          .from('prayer_praying')
          .select('prayer_id')
          .eq('user_id', user.id),
      ])

      const currentIsDemo = profileRes.data?.is_demo === true
      if (profileRes.data) {
        setIsAdmin(profileRes.data.role === 'admin')
        setIsDemo(currentIsDemo)
      }
      setActive(((activeRes.data ?? []) as PrayerItem[]).filter(p => currentIsDemo || !p.profile?.is_demo))
      setAnswered(((answeredRes.data ?? []) as PrayerItem[]).filter(p => currentIsDemo || !p.profile?.is_demo))
      setMyPrayingIds(new Set((prayingRes.data ?? []).map((p) => p.prayer_id)))
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function addRequest() {
    if (!newBody.trim() || !currentUserId) return
    setSubmitting(true)
    const res = await fetch('/api/prayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newBody.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setActive((prev) => [{ ...data, profile: null, comments: [] }, ...prev])
      setNewBody('')
      setShowAddForm(false)
    }
    setSubmitting(false)
  }

  async function togglePraying(prayerId: string) {
    const res = await fetch('/api/prayer/toggle-praying', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prayer_id: prayerId }),
    })
    if (res.ok) {
      const { praying, count } = await res.json()
      setMyPrayingIds((prev) => {
        const next = new Set(prev)
        praying ? next.add(prayerId) : next.delete(prayerId)
        return next
      })
      setActive((prev) =>
        prev.map((p) => p.id === prayerId ? { ...p, praying_count: count } : p)
      )
    }
  }

  async function markAnswered(prayerId: string) {
    const res = await fetch('/api/prayer/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prayer_id: prayerId, answered_note: answerNote }),
    })
    if (res.ok) {
      const item = active.find((p) => p.id === prayerId)
      if (item) {
        setAnswered((prev) => [{ ...item, is_answered: true, answered_note: answerNote || null, answered_at: new Date().toISOString() }, ...prev])
        setActive((prev) => prev.filter((p) => p.id !== prayerId))
      }
      setMarkingAnsweredId(null)
      setAnswerNote('')
      setShowTestimonies(true)
    }
  }

  async function removeRequest(prayerId: string) {
    const res = await fetch('/api/prayer', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prayerId }),
    })
    if (res.ok) {
      setActive((prev) => prev.filter((p) => p.id !== prayerId))
      setConfirmRemoveId(null)
    }
  }

  async function addComment(prayerId: string) {
    if (!commentBody.trim()) return
    const res = await fetch('/api/prayer/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prayer_id: prayerId, body: commentBody.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setActive((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? { ...p, comments: [...p.comments, { ...data, profile: null }] }
            : p
        )
      )
      setCommentBody('')
      setCommentingId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
      </div>
    )
  }

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 20,
    border: '1px solid var(--border)',
    padding: 20,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 12,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', paddingBottom: 96 }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Prayer Wall</h1>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Carry each other&apos;s burdens.</p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            style={{ minHeight: 44, padding: '0 20px', backgroundColor: '#6C63FF', color: 'white', fontSize: 14, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer' }}
          >
            + Share
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div style={cardStyle}>
            <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>Share a prayer request</h2>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What would you like the group to pray for?"
              rows={4}
              style={{ width: '100%', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={addRequest}
                disabled={submitting || !newBody.trim()}
                style={{ flex: 1, minHeight: 48, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, borderRadius: 14, fontSize: 14, border: 'none', cursor: submitting || !newBody.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !newBody.trim() ? 0.5 : 1 }}
              >
                {submitting ? 'Sharing…' : 'Share request'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewBody('') }}
                style={{ minHeight: 48, padding: '0 16px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: 500, borderRadius: 14, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prayer requests..."
            style={{ width: '100%', paddingRight: search ? 40 : 16 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Active requests */}
        {(() => {
          const q = search.trim().toLowerCase()
          const displayList = q
            ? active.filter(p =>
                p.body.toLowerCase().includes(q) ||
                (p.profile?.display_name ?? p.profile?.full_name ?? '').toLowerCase().includes(q)
              )
            : active

          if (q && displayList.length === 0) return (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No prayer requests match your search.</p>
            </div>
          )
          if (!q && active.length === 0) return (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No prayer requests yet. Be the first to share one.</p>
            </div>
          )

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayList.map((prayer) => {
            const name = prayer.profile?.display_name ?? prayer.profile?.full_name ?? 'A member'
            const fullName = prayer.profile?.full_name ?? 'M'
            const isOwn = prayer.user_id === currentUserId
            const isPraying = myPrayingIds.has(prayer.id)
            const canAdminDelete = isAdmin && !isOwn

            return (
              <div key={prayer.id} style={cardStyle}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={fullName} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{timeAgo(prayer.created_at)}</p>
                  </div>
                </div>

                {/* Body */}
                <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6 }}>{prayer.body}</p>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => togglePraying(prayer.id)}
                    style={{
                      minHeight: 36,
                      padding: '0 12px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      border: isPraying ? '1px solid rgba(108,99,255,0.4)' : '1px solid var(--border)',
                      backgroundColor: isPraying ? 'rgba(108,99,255,0.2)' : 'var(--bg-input)',
                      color: isPraying ? '#A09AF8' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    🙏 {prayer.praying_count > 0 ? prayer.praying_count : ''}
                    <span>{isPraying ? 'Praying' : 'Pray'}</span>
                  </button>

                  {!isOwn && (
                    <button
                      onClick={() => { setCommentingId(commentingId === prayer.id ? null : prayer.id); setCommentBody('') }}
                      style={{ minHeight: 36, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      Encourage
                    </button>
                  )}

                  {isOwn && (
                    <>
                      {markingAnsweredId === prayer.id ? null : (
                        <button
                          onClick={() => { setMarkingAnsweredId(prayer.id); setAnswerNote('') }}
                          style={{ minHeight: 36, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: 'rgba(76,175,80,0.15)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)', cursor: 'pointer' }}
                        >
                          Answered
                        </button>
                      )}
                      {confirmRemoveId === prayer.id ? null : (
                        <button
                          onClick={() => setConfirmRemoveId(prayer.id)}
                          style={{ minHeight: 36, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: 'var(--bg-input)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}

                  {canAdminDelete && confirmRemoveId !== prayer.id && (
                    <button
                      onClick={() => setConfirmRemoveId(prayer.id)}
                      style={{ minHeight: 36, padding: '0 10px', borderRadius: 10, fontSize: 16, backgroundColor: 'transparent', color: 'rgba(255,77,77,0.5)', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                      title="Delete prayer request"
                    >
                      🗑
                    </button>
                  )}
                </div>

                {/* Mark as answered inline form */}
                {markingAnsweredId === prayer.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>How did God answer this? (optional)</p>
                    <textarea
                      value={answerNote}
                      onChange={(e) => setAnswerNote(e.target.value)}
                      placeholder="Share the testimony…"
                      rows={3}
                      style={{ width: '100%', resize: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => markAnswered(prayer.id)}
                        style={{ flex: 1, minHeight: 40, backgroundColor: '#4CAF50', color: 'white', fontWeight: 700, borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                      >
                        Save testimony
                      </button>
                      <button
                        onClick={() => markAnswered(prayer.id)}
                        style={{ minHeight: 40, padding: '0 12px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => setMarkingAnsweredId(null)}
                        style={{ minHeight: 40, padding: '0 12px', backgroundColor: 'var(--bg-input)', color: 'var(--text-tertiary)', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Remove confirmation */}
                {confirmRemoveId === prayer.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Remove this request? It won&apos;t be marked as answered.</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => removeRequest(prayer.id)}
                        style={{ flex: 1, minHeight: 40, backgroundColor: 'rgba(255,77,77,0.15)', color: '#FF4D4D', fontWeight: 700, borderRadius: 10, fontSize: 13, border: '1px solid rgba(255,77,77,0.3)', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        style={{ minHeight: 40, padding: '0 16px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                {/* Encouragement comment form */}
                {commentingId === prayer.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Still praying for you 🙏"
                      rows={2}
                      style={{ width: '100%', resize: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => addComment(prayer.id)}
                        disabled={!commentBody.trim()}
                        style={{ flex: 1, minHeight: 40, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, borderRadius: 10, fontSize: 13, border: 'none', cursor: !commentBody.trim() ? 'not-allowed' : 'pointer', opacity: !commentBody.trim() ? 0.5 : 1 }}
                      >
                        Send
                      </button>
                      <button
                        onClick={() => { setCommentingId(null); setCommentBody('') }}
                        style={{ minHeight: 40, padding: '0 16px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {prayer.comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    {prayer.comments.map((c) => (
                      <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: getAvatarColor(c.profile?.full_name ?? 'M'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0, marginTop: 2, textTransform: 'uppercase' }}>
                          {(c.profile?.full_name ?? 'M')[0]}
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginRight: 6 }}>
                            {c.profile?.display_name ?? c.profile?.full_name ?? 'A member'}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.body}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          </div>
          )
        })()}

        {/* Testimonies section */}
        <div>
          <button
            onClick={() => setShowTestimonies((v) => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingTop: 8, paddingBottom: 8, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨</span> Testimonies
              {answered.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 'normal' }}>
                  ({answered.length})
                </span>
              )}
            </h2>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{showTestimonies ? '▲' : '▼'}</span>
          </button>

          {showTestimonies && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {answered.length === 0 && (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', paddingLeft: 4 }}>Answered prayers will appear here.</p>
              )}
              {answered.map((prayer) => {
                const name = prayer.profile?.display_name ?? prayer.profile?.full_name ?? 'A member'
                return (
                  <div key={prayer.id} style={{ backgroundColor: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.15)', padding: '2px 10px', borderRadius: 20 }}>
                        God is faithful 🙏
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {prayer.answered_at ? timeAgo(prayer.answered_at) : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{name}&apos;s prayer</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{prayer.body}</p>
                    {prayer.answered_note && (
                      <div style={{ borderTop: '1px solid rgba(76,175,80,0.2)', paddingTop: 8, marginTop: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#4CAF50', marginBottom: 4 }}>How God answered:</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{prayer.answered_note}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
