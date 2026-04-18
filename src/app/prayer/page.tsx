'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

type PrayerProfile = { full_name: string; display_name: string | null }
type Comment = { id: string; body: string; user_id: string; created_at: string; profile: PrayerProfile | null }
type PrayerItem = {
  id: string; user_id: string; body: string; is_answered: boolean;
  answered_note: string | null; praying_count: number; created_at: string;
  answered_at: string | null; profile: PrayerProfile | null; comments: Comment[]
}

const AVATAR_COLORS = ['#FF4D4D', '#FF9500', '#4CAF50', '#6C63FF', '#00BCD4', '#E91E63']
function avatarColor(name: string): string {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function InitialsCircle({ name, size = 36 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold uppercase text-white flex-shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

export default function PrayerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [active, setActive] = useState<PrayerItem[]>([])
  const [answered, setAnswered] = useState<PrayerItem[]>([])
  const [myPrayingIds, setMyPrayingIds] = useState<Set<string>>(new Set())
  const [showTestimonies, setShowTestimonies] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBody, setNewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [markingAnsweredId, setMarkingAnsweredId] = useState<string | null>(null)
  const [answerNote, setAnswerNote] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [commentBody, setCommentBody] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [activeRes, answeredRes, prayingRes] = await Promise.all([
        supabase.from('prayer_requests')
          .select('*, profile:profiles(full_name, display_name), comments:prayer_comments(id, body, user_id, created_at, profile:profiles(full_name, display_name))')
          .eq('is_answered', false).order('created_at', { ascending: false }),
        supabase.from('prayer_requests')
          .select('*, profile:profiles(full_name, display_name), comments:prayer_comments(id, body, user_id, created_at, profile:profiles(full_name, display_name))')
          .eq('is_answered', true).order('answered_at', { ascending: false }),
        supabase.from('prayer_praying').select('prayer_id').eq('user_id', user.id),
      ])

      setActive((activeRes.data ?? []) as PrayerItem[])
      setAnswered((answeredRes.data ?? []) as PrayerItem[])
      setMyPrayingIds(new Set((prayingRes.data ?? []).map((p) => p.prayer_id)))
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function addRequest() {
    if (!newBody.trim() || !currentUserId) return
    setSubmitting(true)
    const res = await fetch('/api/prayer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prayer_id: prayerId }),
    })
    if (res.ok) {
      const { praying, count } = await res.json()
      setMyPrayingIds((prev) => { const next = new Set(prev); praying ? next.add(prayerId) : next.delete(prayerId); return next })
      setActive((prev) => prev.map((p) => p.id === prayerId ? { ...p, praying_count: count } : p))
    }
  }

  async function markAnswered(prayerId: string) {
    const res = await fetch('/api/prayer/answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prayerId }),
    })
    if (res.ok) { setActive((prev) => prev.filter((p) => p.id !== prayerId)); setConfirmRemoveId(null) }
  }

  async function addComment(prayerId: string) {
    if (!commentBody.trim()) return
    const res = await fetch('/api/prayer/comment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prayer_id: prayerId, body: commentBody.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setActive((prev) => prev.map((p) => p.id === prayerId ? { ...p, comments: [...p.comments, { ...data, profile: null }] } : p))
      setCommentBody('')
      setCommentingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <p style={{ color: '#606060' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A0A' }}>
      <div className="max-w-md mx-auto px-4 pt-10 pb-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>Prayer Wall</h1>
            <p style={{ fontSize: '14px', color: '#606060', marginTop: '4px' }}>Carry each other&apos;s burdens.</p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="min-h-[44px] px-4 rounded-full transition-opacity hover:opacity-80"
            style={{
              background: showAddForm ? '#2A2A2A' : '#6C63FF',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              border: showAddForm ? '1px solid #333333' : 'none',
            }}
          >
            {showAddForm ? 'Cancel' : '+ Share'}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Share a prayer request</p>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What would you like the group to pray for?"
              rows={4}
              className="w-full resize-none"
              style={{ padding: '14px 16px', fontSize: '15px', lineHeight: 1.5, borderRadius: '12px' }}
            />
            <div className="flex gap-3">
              <button
                onClick={addRequest}
                disabled={submitting || !newBody.trim()}
                className="flex-1 min-h-[48px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#6C63FF', fontWeight: 600, fontSize: '15px' }}
              >
                {submitting ? 'Sharing…' : 'Share request'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewBody('') }}
                className="min-h-[48px] px-5 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: '#2A2A2A', color: '#A0A0A0', fontWeight: 500, fontSize: '14px', border: '1px solid #333333' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active prayer requests */}
        {active.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            <p style={{ fontSize: '14px', color: '#606060' }}>No prayer requests yet. Be the first to share one.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            {active.map((prayer, index) => {
              const name = prayer.profile?.display_name ?? prayer.profile?.full_name ?? 'A member'
              const isOwn = prayer.user_id === currentUserId
              const isPraying = myPrayingIds.has(prayer.id)

              return (
                <div key={prayer.id} className="px-4 py-4 flex flex-col gap-3" style={index > 0 ? { borderTop: '1px solid #2A2A2A' } : {}}>
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <InitialsCircle name={prayer.profile?.full_name ?? 'M'} size={36} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}>{name}</p>
                      <p style={{ fontSize: '12px', color: '#606060' }}>{timeAgo(prayer.created_at)}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <p style={{ fontSize: '15px', color: '#FFFFFF', lineHeight: 1.6 }}>{prayer.body}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => togglePraying(prayer.id)}
                      className="min-h-[36px] px-3 rounded-full transition-all"
                      style={{
                        background: isPraying ? 'rgba(108,99,255,0.2)' : '#2A2A2A',
                        color: isPraying ? '#A89EFF' : '#A0A0A0',
                        fontSize: '13px', fontWeight: 500,
                        border: isPraying ? '1px solid rgba(108,99,255,0.4)' : '1px solid #333333',
                      }}
                    >
                      {prayer.praying_count > 0 ? `🙏 ${prayer.praying_count} ` : '🙏 '}{isPraying ? 'Praying' : 'Pray'}
                    </button>

                    {!isOwn && (
                      <button
                        onClick={() => { setCommentingId(commentingId === prayer.id ? null : prayer.id); setCommentBody('') }}
                        className="min-h-[36px] px-3 rounded-full transition-all"
                        style={{ background: '#2A2A2A', color: '#A0A0A0', fontSize: '13px', fontWeight: 500, border: '1px solid #333333' }}
                      >
                        Encourage
                      </button>
                    )}

                    {isOwn && markingAnsweredId !== prayer.id && (
                      <button
                        onClick={() => { setMarkingAnsweredId(prayer.id); setAnswerNote('') }}
                        className="min-h-[36px] px-3 rounded-full transition-all"
                        style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50', fontSize: '13px', fontWeight: 500, border: '1px solid rgba(76,175,80,0.3)' }}
                      >
                        Answered
                      </button>
                    )}

                    {isOwn && confirmRemoveId !== prayer.id && (
                      <button
                        onClick={() => setConfirmRemoveId(prayer.id)}
                        className="min-h-[36px] px-3 rounded-full transition-all"
                        style={{ background: '#2A2A2A', color: '#606060', fontSize: '13px', fontWeight: 500, border: '1px solid #333333' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Mark as answered */}
                  {markingAnsweredId === prayer.id && (
                    <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #2A2A2A' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}>How did God answer this? <span style={{ color: '#606060', fontWeight: 400 }}>(optional)</span></p>
                      <textarea
                        value={answerNote}
                        onChange={(e) => setAnswerNote(e.target.value)}
                        placeholder="Share the testimony…"
                        rows={3}
                        className="w-full resize-none"
                        style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '12px' }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => markAnswered(prayer.id)} className="flex-1 min-h-[44px] rounded-xl text-white hover:opacity-90" style={{ background: '#4CAF50', fontWeight: 600, fontSize: '14px' }}>
                          Save testimony
                        </button>
                        <button onClick={() => markAnswered(prayer.id)} className="min-h-[44px] px-4 rounded-xl hover:opacity-80" style={{ background: '#2A2A2A', color: '#A0A0A0', fontSize: '14px', border: '1px solid #333333' }}>
                          Skip
                        </button>
                        <button onClick={() => setMarkingAnsweredId(null)} className="min-h-[44px] px-4 rounded-xl hover:opacity-80" style={{ background: '#2A2A2A', color: '#606060', fontSize: '14px', border: '1px solid #333333' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remove confirmation */}
                  {confirmRemoveId === prayer.id && (
                    <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #2A2A2A' }}>
                      <p style={{ fontSize: '14px', color: '#A0A0A0' }}>Remove this request? It won&apos;t be marked as answered.</p>
                      <div className="flex gap-2">
                        <button onClick={() => removeRequest(prayer.id)} className="flex-1 min-h-[44px] rounded-xl hover:opacity-80" style={{ background: '#2E1212', color: '#FF4D4D', fontSize: '14px', fontWeight: 600, border: '1px solid #4A1F1F' }}>
                          Remove
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)} className="min-h-[44px] px-4 rounded-xl hover:opacity-80" style={{ background: '#2A2A2A', color: '#A0A0A0', fontSize: '14px', border: '1px solid #333333' }}>
                          Keep it
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Encourage form */}
                  {commentingId === prayer.id && (
                    <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #2A2A2A' }}>
                      <textarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Still praying for you…"
                        rows={2}
                        className="w-full resize-none"
                        style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '12px' }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => addComment(prayer.id)} disabled={!commentBody.trim()} className="flex-1 min-h-[44px] rounded-xl text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#6C63FF', fontWeight: 600, fontSize: '14px' }}>
                          Send
                        </button>
                        <button onClick={() => { setCommentingId(null); setCommentBody('') }} className="min-h-[44px] px-4 rounded-xl hover:opacity-80" style={{ background: '#2A2A2A', color: '#A0A0A0', fontSize: '14px', border: '1px solid #333333' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {prayer.comments.length > 0 && (
                    <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #2A2A2A' }}>
                      {prayer.comments.map((c) => (
                        <div key={c.id} className="flex gap-2 items-start">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold uppercase text-white flex-shrink-0 mt-0.5"
                            style={{ background: avatarColor(c.profile?.full_name ?? 'M') }}
                          >
                            {(c.profile?.full_name ?? 'M')[0]}
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', marginRight: '6px' }}>
                              {c.profile?.display_name ?? c.profile?.full_name ?? 'A member'}
                            </span>
                            <span style={{ fontSize: '14px', color: '#FFFFFF' }}>{c.body}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Testimonies */}
        <div>
          <button
            onClick={() => setShowTestimonies((v) => !v)}
            className="w-full flex items-center justify-between min-h-[44px] py-2"
          >
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Testimonies{answered.length > 0 && ` (${answered.length})`}
            </p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showTestimonies ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showTestimonies && (
            <div className="flex flex-col gap-3 mt-2">
              {answered.length === 0 && (
                <p style={{ fontSize: '14px', color: '#606060', padding: '4px' }}>Answered prayers will appear here.</p>
              )}
              {answered.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#1A2E1A', border: '1px solid #2D4A2D' }}>
                  {answered.map((prayer, index) => {
                    const name = prayer.profile?.display_name ?? prayer.profile?.full_name ?? 'A member'
                    return (
                      <div key={prayer.id} className="px-4 py-4 flex flex-col gap-2" style={index > 0 ? { borderTop: '1px solid #2D4A2D' } : {}}>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full px-3 py-1" style={{ background: 'rgba(76,175,80,0.2)', color: '#4CAF50', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(76,175,80,0.3)' }}>
                            God is faithful
                          </span>
                          <span style={{ fontSize: '12px', color: '#606060' }}>
                            {prayer.answered_at ? timeAgo(prayer.answered_at) : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A0A0A0' }}>{name}&apos;s prayer</p>
                        <p style={{ fontSize: '14px', color: '#FFFFFF', lineHeight: 1.6 }}>{prayer.body}</p>
                        {prayer.answered_note && (
                          <div className="pt-2" style={{ borderTop: '1px solid #2D4A2D' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#4CAF50', marginBottom: '4px' }}>How God answered:</p>
                            <p style={{ fontSize: '14px', color: '#FFFFFF', lineHeight: 1.6 }}>{prayer.answered_note}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
