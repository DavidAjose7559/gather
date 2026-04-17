'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

type PrayerProfile = { full_name: string; display_name: string | null }

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

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2)
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase">
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

      const [activeRes, answeredRes, prayingRes] = await Promise.all([
        supabase
          .from('prayer_requests')
          .select('*, profile:profiles(full_name, display_name), comments:prayer_comments(id, body, user_id, created_at, profile:profiles(full_name, display_name))')
          .eq('is_answered', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('prayer_requests')
          .select('*, profile:profiles(full_name, display_name), comments:prayer_comments(id, body, user_id, created_at, profile:profiles(full_name, display_name))')
          .eq('is_answered', true)
          .order('answered_at', { ascending: false }),
        supabase
          .from('prayer_praying')
          .select('prayer_id')
          .eq('user_id', user.id),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prayer Wall</h1>
            <p className="text-sm text-gray-500 mt-0.5">Carry each other&apos;s burdens.</p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="min-h-[44px] px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            + Share
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Share a prayer request</h2>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What would you like the group to pray for?"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={addRequest}
                disabled={submitting || !newBody.trim()}
                className="flex-1 min-h-[48px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl text-sm hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Sharing…' : 'Share request'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewBody('') }}
                className="min-h-[48px] px-4 bg-gray-100 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active requests */}
        <div className="flex flex-col gap-3">
          {active.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No prayer requests yet. Be the first to share one.</p>
            </div>
          )}

          {active.map((prayer) => {
            const name = prayer.profile?.display_name ?? prayer.profile?.full_name ?? 'A member'
            const isOwn = prayer.user_id === currentUserId
            const isPraying = myPrayingIds.has(prayer.id)

            return (
              <div key={prayer.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Initials name={prayer.profile?.full_name ?? 'M'} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    <p className="text-xs text-gray-400">{timeAgo(prayer.created_at)}</p>
                  </div>
                </div>

                {/* Body */}
                <p className="text-gray-800 text-sm leading-relaxed">{prayer.body}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => togglePraying(prayer.id)}
                    className={`min-h-[36px] px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isPraying
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🙏 {prayer.praying_count > 0 ? prayer.praying_count : ''}
                    <span>{isPraying ? 'Praying' : 'Pray'}</span>
                  </button>

                  {!isOwn && (
                    <button
                      onClick={() => { setCommentingId(commentingId === prayer.id ? null : prayer.id); setCommentBody('') }}
                      className="min-h-[36px] px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                    >
                      Encourage
                    </button>
                  )}

                  {isOwn && (
                    <>
                      {markingAnsweredId === prayer.id ? null : (
                        <button
                          onClick={() => { setMarkingAnsweredId(prayer.id); setAnswerNote('') }}
                          className="min-h-[36px] px-3 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-all border border-green-200"
                        >
                          Answered
                        </button>
                      )}
                      {confirmRemoveId === prayer.id ? null : (
                        <button
                          onClick={() => setConfirmRemoveId(prayer.id)}
                          className="min-h-[36px] px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Mark as answered inline form */}
                {markingAnsweredId === prayer.id && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700">How did God answer this? (optional)</p>
                    <textarea
                      value={answerNote}
                      onChange={(e) => setAnswerNote(e.target.value)}
                      placeholder="Share the testimony…"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAnswered(prayer.id)}
                        className="flex-1 min-h-[40px] bg-green-600 text-white font-semibold rounded-lg text-sm hover:bg-green-700 transition-all"
                      >
                        Save testimony
                      </button>
                      <button
                        onClick={() => markAnswered(prayer.id)}
                        className="min-h-[40px] px-3 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-all"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => setMarkingAnsweredId(null)}
                        className="min-h-[40px] px-3 bg-gray-100 text-gray-400 rounded-lg text-sm hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Remove confirmation */}
                {confirmRemoveId === prayer.id && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                    <p className="text-sm text-gray-600">Remove this request? It won&apos;t be marked as answered.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => removeRequest(prayer.id)}
                        className="flex-1 min-h-[40px] bg-red-50 text-red-600 font-semibold rounded-lg text-sm hover:bg-red-100 transition-all border border-red-200"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="min-h-[40px] px-4 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-all"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                {/* Encouragement comment form */}
                {commentingId === prayer.id && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Still praying for you 🙏"
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => addComment(prayer.id)}
                        disabled={!commentBody.trim()}
                        className="flex-1 min-h-[40px] bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => { setCommentingId(null); setCommentBody('') }}
                        className="min-h-[40px] px-4 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {prayer.comments.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                    {prayer.comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5 uppercase">
                          {(c.profile?.full_name ?? 'M')[0]}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-600 mr-1.5">
                            {c.profile?.display_name ?? c.profile?.full_name ?? 'A member'}
                          </span>
                          <span className="text-sm text-gray-700">{c.body}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Testimonies section */}
        <div>
          <button
            onClick={() => setShowTestimonies((v) => !v)}
            className="w-full flex items-center justify-between min-h-[44px] py-2"
          >
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <span>✨</span> Testimonies
              {answered.length > 0 && (
                <span className="text-xs font-normal text-gray-400 normal-case tracking-normal">
                  ({answered.length})
                </span>
              )}
            </h2>
            <span className="text-gray-400 text-sm">{showTestimonies ? '▲' : '▼'}</span>
          </button>

          {showTestimonies && (
            <div className="flex flex-col gap-3 mt-2">
              {answered.length === 0 && (
                <p className="text-sm text-gray-400 px-1">Answered prayers will appear here.</p>
              )}
              {answered.map((prayer) => {
                const name = prayer.profile?.display_name ?? prayer.profile?.full_name ?? 'A member'
                return (
                  <div key={prayer.id} className="bg-green-50 border border-green-100 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        God is faithful 🙏
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {prayer.answered_at ? timeAgo(prayer.answered_at) : ''}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{name}&apos;s prayer</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{prayer.body}</p>
                    {prayer.answered_note && (
                      <div className="border-t border-green-200 pt-2 mt-1">
                        <p className="text-xs font-medium text-green-700 mb-1">How God answered:</p>
                        <p className="text-gray-700 text-sm leading-relaxed">{prayer.answered_note}</p>
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
