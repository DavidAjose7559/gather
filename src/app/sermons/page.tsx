'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayToronto } from '@/lib/date'
import { timeAgo } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import Image from 'next/image'
import type { SermonSchedule, SermonCurriculum, SermonDiscussion } from '@/lib/types'

type DiscussionWithProfile = SermonDiscussion & {
  profiles: { full_name: string; display_name: string | null } | null
}

type SpotifyResult = {
  id: string
  name: string
  description: string
  images: { url: string }[]
  external_urls: { spotify: string }
  release_date: string
}

function formatSermonDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function SermonCard({
  sermon,
  isAdmin,
  onDeleted,
}: {
  sermon: SermonSchedule
  isAdmin: boolean
  onDeleted?: () => void
}) {
  const imageUrl = sermon.episode_image_url
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={imageUrl}
            alt={sermon.episode_title}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
        {sermon.theme && (
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            {sermon.theme}
          </span>
        )}
        <h2 className="font-bold text-gray-900 text-lg leading-snug">{sermon.episode_title}</h2>
        {sermon.episode_description && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
            {sermon.episode_description}
          </p>
        )}
        {sermon.notes && (
          <p className="text-sm text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 leading-relaxed">
            {sermon.notes}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-1">
          {sermon.episode_url && (
            <a
              href={sermon.episode_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-600 transition-colors"
            >
              <span>🎵</span> Spotify
            </a>
          )}
          {sermon.youtube_url && (
            <a
              href={sermon.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-red-600 transition-colors"
            >
              <span>▶️</span> YouTube
            </a>
          )}
        </div>
        {isAdmin && onDeleted && (
          <button
            onClick={onDeleted}
            className="text-xs text-red-400 hover:text-red-600 text-left mt-1 transition-colors"
          >
            Remove from schedule
          </button>
        )}
      </div>
    </div>
  )
}

function DiscussionSection({ sermon, userId, userDisplayName }: {
  sermon: SermonSchedule
  userId: string
  userDisplayName: string
}) {
  const [posts, setPosts] = useState<DiscussionWithProfile[]>([])
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/sermons/discussion?schedule_id=${sermon.id}`)
      .then(r => r.json())
      .then(d => setPosts(d.discussions ?? []))
  }, [sermon.id])

  async function submit() {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/sermons/discussion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_id: sermon.id, body }),
    })
    const d = await res.json()
    if (d.discussion) {
      setPosts(prev => [...prev, d.discussion])
      setBody('')
    }
    setSubmitting(false)
  }

  async function deletePost(id: string) {
    await fetch(`/api/sermons/discussion?id=${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">Discussion</h3>
      {posts.length === 0 && (
        <p className="text-sm text-gray-400">No replies yet. Be the first to share a thought.</p>
      )}
      {posts.map(post => {
        const name = post.profiles?.display_name ?? post.profiles?.full_name ?? 'Member'
        const isOwn = post.user_id === userId
        return (
          <div key={post.id} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 uppercase">
              {name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-900">{name}</span>
                <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{post.body}</p>
              {isOwn && (
                <button
                  onClick={() => deletePost(post.id)}
                  className="text-xs text-gray-400 hover:text-red-500 mt-0.5 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div className="flex gap-2 mt-1">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share a thought or reflection…"
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <button
          onClick={submit}
          disabled={!body.trim() || submitting}
          className="flex-shrink-0 bg-indigo-600 text-white text-sm font-semibold px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all"
        >
          Post
        </button>
      </div>
    </div>
  )
}

function AdminSchedulePanel({
  curricula,
  onSaved,
}: {
  curricula: SermonCurriculum[]
  onSaved: (sermon: SermonSchedule) => void
}) {
  const today = todayToronto()
  const [date, setDate] = useState(today)
  const [curriculumId, setCurriculumId] = useState('')
  const [source, setSource] = useState<'spotify' | 'manual'>('manual')
  const [spotifyQuery, setSpotifyQuery] = useState('')
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<SpotifyResult | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualImage, setManualImage] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [theme, setTheme] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCurrName, setNewCurrName] = useState('')
  const [creatingCurr, setCreatingCurr] = useState(false)
  const [currList, setCurrList] = useState(curricula)

  async function searchSpotify() {
    if (!spotifyQuery.trim()) return
    setSearchLoading(true)
    setSpotifyResults([])
    const res = await fetch(`/api/spotify/episodes?query=${encodeURIComponent(spotifyQuery)}`)
    const d = await res.json()
    setSpotifyResults(d.episodes ?? [])
    setSearchLoading(false)
  }

  async function createCurriculum() {
    if (!newCurrName.trim()) return
    setCreatingCurr(true)
    const res = await fetch('/api/curriculum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCurrName }),
    })
    const d = await res.json()
    if (d.curriculum) {
      setCurrList(prev => [d.curriculum, ...prev])
      setCurriculumId(d.curriculum.id)
      setNewCurrName('')
    }
    setCreatingCurr(false)
  }

  async function save() {
    setError(null)
    if (!date) { setError('Date is required'); return }
    const title = source === 'spotify' ? selectedEpisode?.name : manualTitle
    if (!title?.trim()) { setError('Episode title is required'); return }

    setSaving(true)
    const payload: Record<string, unknown> = {
      schedule_date: date,
      source,
      episode_title: title.trim(),
      curriculum_id: curriculumId || null,
      theme: theme.trim() || null,
      notes: notes.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
    }
    if (source === 'spotify' && selectedEpisode) {
      payload.episode_id = selectedEpisode.id
      payload.episode_description = selectedEpisode.description || null
      payload.episode_image_url = selectedEpisode.images?.[0]?.url || null
      payload.episode_url = selectedEpisode.external_urls?.spotify || null
    } else {
      payload.episode_description = manualDesc.trim() || null
      payload.episode_image_url = manualImage.trim() || null
    }

    const res = await fetch('/api/sermons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    if (d.error) {
      setError(d.error)
    } else {
      onSaved(d.sermon)
      setSelectedEpisode(null)
      setManualTitle('')
      setManualDesc('')
      setManualImage('')
      setYoutubeUrl('')
      setTheme('')
      setNotes('')
      setSpotifyQuery('')
      setSpotifyResults([])
    }
    setSaving(false)
  }

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-indigo-900 text-sm">Schedule a sermon</h3>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Curriculum */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Series / curriculum <span className="text-gray-400">(optional)</span></label>
        <select
          value={curriculumId}
          onChange={e => setCurriculumId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">None</option>
          {currList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newCurrName}
            onChange={e => setNewCurrName(e.target.value)}
            placeholder="New series name…"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={createCurriculum}
            disabled={!newCurrName.trim() || creatingCurr}
            className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all"
          >
            Add
          </button>
        </div>
      </div>

      {/* Source toggle */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
        <div className="flex gap-2">
          {(['spotify', 'manual'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                source === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s === 'spotify' ? '🎵 Spotify' : '✍️ Manual'}
            </button>
          ))}
        </div>
      </div>

      {source === 'spotify' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={spotifyQuery}
              onChange={e => setSpotifyQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchSpotify()}
              placeholder="Search episodes… (e.g. Romans grace)"
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={searchSpotify}
              disabled={searchLoading || !spotifyQuery.trim()}
              className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 disabled:opacity-40 transition-all"
            >
              {searchLoading ? '…' : 'Search'}
            </button>
          </div>
          {spotifyResults.length > 0 && (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {spotifyResults.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEpisode(ep)}
                  className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all border ${
                    selectedEpisode?.id === ep.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {ep.images?.[0]?.url && (
                    <Image
                      src={ep.images[0].url}
                      alt={ep.name}
                      width={40}
                      height={40}
                      className="rounded-lg flex-shrink-0 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{ep.name}</p>
                    <p className="text-xs text-gray-400">{ep.release_date}</p>
                  </div>
                  {selectedEpisode?.id === ep.id && (
                    <span className="text-indigo-600 text-xs font-bold flex-shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedEpisode && (
            <p className="text-xs text-indigo-700 font-medium bg-indigo-50 rounded-lg px-3 py-1.5">
              Selected: {selectedEpisode.name}
            </p>
          )}
        </div>
      )}

      {source === 'manual' && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={manualTitle}
            onChange={e => setManualTitle(e.target.value)}
            placeholder="Episode / sermon title *"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={manualDesc}
            onChange={e => setManualDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="url"
            value={manualImage}
            onChange={e => setManualImage(e.target.value)}
            placeholder="Cover image URL (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Shared fields */}
      <input
        type="url"
        value={youtubeUrl}
        onChange={e => setYoutubeUrl(e.target.value)}
        placeholder="YouTube URL (optional)"
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        type="text"
        value={theme}
        onChange={e => setTheme(e.target.value)}
        placeholder="Theme / tag (e.g. Faith, Romans 8)"
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes for the group (optional)"
        rows={2}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full min-h-[44px] bg-indigo-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
      >
        {saving ? 'Saving…' : 'Save to schedule'}
      </button>
    </div>
  )
}

export default function SermonsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'today' | 'schedule'>('today')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userDisplayName, setUserDisplayName] = useState('')
  const [todaySermon, setTodaySermon] = useState<SermonSchedule | null>(null)
  const [scheduleSermons, setScheduleSermons] = useState<SermonSchedule[]>([])
  const [curricula, setCurricula] = useState<SermonCurriculum[]>([])
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  const today = todayToronto()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [profileRes, todayRes, scheduleRes, currRes] = await Promise.all([
        supabase.from('profiles').select('role, full_name, display_name').eq('id', user.id).single(),
        fetch('/api/sermons/today').then(r => r.json()),
        fetch('/api/sermons').then(r => r.json()),
        fetch('/api/curriculum').then(r => r.json()),
      ])

      if (profileRes.data) {
        setIsAdmin(profileRes.data.role === 'admin')
        setUserDisplayName(profileRes.data.display_name ?? profileRes.data.full_name)
      }
      setTodaySermon(todayRes.sermon ?? null)
      setScheduleSermons(scheduleRes.sermons ?? [])
      setCurricula(currRes.curricula ?? [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteSermon(id: string) {
    await fetch(`/api/sermons?id=${id}`, { method: 'DELETE' })
    setScheduleSermons(prev => prev.filter(s => s.id !== id))
    if (todaySermon?.id === id) setTodaySermon(null)
  }

  function onAdminSaved(sermon: SermonSchedule) {
    setScheduleSermons(prev => {
      const idx = prev.findIndex(s => s.schedule_date === sermon.schedule_date)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = sermon
        return next
      }
      return [...prev, sermon].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
    })
    if (sermon.schedule_date === today) setTodaySermon(sermon)
    setShowAdminPanel(false)
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
          <h1 className="text-2xl font-bold text-gray-900">Sermon of the Day</h1>
          {isAdmin && (
            <button
              onClick={() => { setShowAdminPanel(p => !p); setTab('schedule') }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 min-h-[44px] flex items-center"
            >
              {showAdminPanel ? 'Close' : '+ Schedule'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['today', 'schedule'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'today' ? "Today's Sermon" : 'Schedule'}
            </button>
          ))}
        </div>

        {/* Admin panel (inline on Schedule tab) */}
        {isAdmin && showAdminPanel && tab === 'schedule' && (
          <AdminSchedulePanel curricula={curricula} onSaved={onAdminSaved} />
        )}

        {/* TODAY TAB */}
        {tab === 'today' && (
          <>
            {!todaySermon ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                <p className="text-4xl mb-3">🎙️</p>
                <p className="font-semibold text-gray-900 mb-1">No sermon scheduled today</p>
                <p className="text-sm text-gray-400">
                  {isAdmin ? 'Use the Schedule tab to add one.' : 'Check back soon.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    {formatSermonDate(todaySermon.schedule_date)}
                  </p>
                </div>
                <SermonCard
                  sermon={todaySermon}
                  isAdmin={isAdmin}
                  onDeleted={() => deleteSermon(todaySermon.id)}
                />
                {userId && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <DiscussionSection
                      sermon={todaySermon}
                      userId={userId}
                      userDisplayName={userDisplayName}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <>
            {scheduleSermons.length === 0 && !showAdminPanel && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-semibold text-gray-900 mb-1">No sermons scheduled yet</p>
                {isAdmin && (
                  <p className="text-sm text-gray-400">Click &quot;+ Schedule&quot; to add one.</p>
                )}
              </div>
            )}
            {scheduleSermons.map(sermon => (
              <div key={sermon.id} className="flex flex-col gap-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  sermon.schedule_date === today ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  {formatSermonDate(sermon.schedule_date)}
                  {sermon.schedule_date === today && (
                    <span className="ml-1.5 text-indigo-600">· Today</span>
                  )}
                </p>
                <SermonCard
                  sermon={sermon}
                  isAdmin={isAdmin}
                  onDeleted={() => deleteSermon(sermon.id)}
                />
              </div>
            ))}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
