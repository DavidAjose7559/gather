'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayToronto } from '@/lib/date'
import { timeAgo } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import Image from 'next/image'
import type { SermonSchedule, SermonCurriculum, SermonDiscussion } from '@/lib/types'

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

type DiscussionWithProfile = SermonDiscussion & {
  profiles: { full_name: string; display_name: string | null } | null
}

function ensureAbsoluteUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
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
    <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', overflow: 'hidden' }}>
      {imageUrl && (
        <div style={{ position: 'relative', width: '100%', height: 192 }}>
          <Image
            src={imageUrl}
            alt={sermon.episode_title}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        </div>
      )}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sermon.theme && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {sermon.theme}
          </span>
        )}
        <h2 style={{ fontWeight: 700, color: 'white', fontSize: 18, lineHeight: 1.3 }}>{sermon.episode_title}</h2>
        {sermon.episode_description && (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {sermon.episode_description}
          </p>
        )}
        {sermon.notes && (
          <p style={{ fontSize: 14, color: '#A09AF8', backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 12, padding: '10px 14px', lineHeight: 1.6 }}>
            {sermon.notes}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {sermon.episode_url && (
            <a
              href={ensureAbsoluteUrl(sermon.episode_url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#1DB954', color: 'white', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 12, textDecoration: 'none' }}
            >
              🎵 Spotify
            </a>
          )}
          {sermon.youtube_url && (
            <a
              href={ensureAbsoluteUrl(sermon.youtube_url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#FF0000', color: 'white', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 12, textDecoration: 'none' }}
            >
              ▶ YouTube
            </a>
          )}
        </div>
        {isAdmin && onDeleted && (
          <button
            onClick={onDeleted}
            style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginTop: 4, opacity: 0.7 }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Discussion</h3>
      {posts.length === 0 && (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No replies yet. Be the first to share a thought.</p>
      )}
      {posts.map(post => {
        const name = post.profiles?.display_name ?? post.profiles?.full_name ?? 'Member'
        const isOwn = post.user_id === userId
        return (
          <div key={post.id} style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: getAvatarColor(post.profiles?.full_name ?? 'M'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0, textTransform: 'uppercase' }}>
              {name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>{name}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{timeAgo(post.created_at)}</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2, lineHeight: 1.5 }}>{post.body}</p>
              {isOwn && (
                <button
                  onClick={() => deletePost(post.id)}
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share a thought or reflection…"
          rows={2}
          style={{ flex: 1, resize: 'none', fontSize: 14 }}
        />
        <button
          onClick={submit}
          disabled={!body.trim() || submitting}
          style={{ flexShrink: 0, backgroundColor: '#6C63FF', color: 'white', fontSize: 14, fontWeight: 700, padding: '0 16px', borderRadius: 12, border: 'none', cursor: !body.trim() || submitting ? 'not-allowed' : 'pointer', opacity: !body.trim() || submitting ? 0.4 : 1 }}
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

  const inputStyle = { width: '100%' }

  return (
    <div style={{ backgroundColor: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontWeight: 600, color: '#A09AF8', fontSize: 14 }}>Schedule a sermon</h3>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
      </div>

      {/* Curriculum */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Series / curriculum <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
        <select value={curriculumId} onChange={e => setCurriculumId(e.target.value)} style={inputStyle}>
          <option value="">None</option>
          {currList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={newCurrName}
            onChange={e => setNewCurrName(e.target.value)}
            placeholder="New series name…"
            style={{ flex: 1 }}
          />
          <button
            onClick={createCurriculum}
            disabled={!newCurrName.trim() || creatingCurr}
            style={{ padding: '0 14px', backgroundColor: '#6C63FF', color: 'white', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', cursor: !newCurrName.trim() || creatingCurr ? 'not-allowed' : 'pointer', opacity: !newCurrName.trim() || creatingCurr ? 0.4 : 1 }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Source toggle */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Source</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['spotify', 'manual'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                border: source === s ? '1px solid #6C63FF' : '1px solid #2A2A2A',
                backgroundColor: source === s ? 'rgba(108,99,255,0.2)' : '#1A1A1A',
                color: source === s ? '#A09AF8' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s === 'spotify' ? '🎵 Spotify' : '✍️ Manual'}
            </button>
          ))}
        </div>
      </div>

      {source === 'spotify' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={spotifyQuery}
              onChange={e => setSpotifyQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchSpotify()}
              placeholder="Search episodes… (e.g. Romans grace)"
              style={{ flex: 1 }}
            />
            <button
              onClick={searchSpotify}
              disabled={searchLoading || !spotifyQuery.trim()}
              style={{ padding: '0 14px', backgroundColor: '#1DB954', color: 'white', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', cursor: searchLoading || !spotifyQuery.trim() ? 'not-allowed' : 'pointer', opacity: searchLoading || !spotifyQuery.trim() ? 0.4 : 1 }}
            >
              {searchLoading ? '…' : 'Search'}
            </button>
          </div>
          {spotifyResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
              {spotifyResults.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEpisode(ep)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    borderRadius: 12,
                    textAlign: 'left',
                    border: selectedEpisode?.id === ep.id ? '1px solid #6C63FF' : '1px solid #2A2A2A',
                    backgroundColor: selectedEpisode?.id === ep.id ? 'rgba(108,99,255,0.15)' : '#111111',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.name}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{ep.release_date}</p>
                  </div>
                  {selectedEpisode?.id === ep.id && (
                    <span style={{ color: '#6C63FF', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedEpisode && (
            <p style={{ fontSize: 13, color: '#A09AF8', fontWeight: 500, backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 10, padding: '6px 12px' }}>
              Selected: {selectedEpisode.name}
            </p>
          )}
        </div>
      )}

      {source === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Episode / sermon title *" style={inputStyle} />
          <textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{ ...inputStyle, resize: 'none' }} />
          <input type="url" value={manualImage} onChange={e => setManualImage(e.target.value)} placeholder="Cover image URL (optional)" style={inputStyle} />
        </div>
      )}

      {/* Shared fields */}
      <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="YouTube URL (optional)" style={inputStyle} />
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: -8 }}>Paste the full URL including https://</p>
      <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Theme / tag (e.g. Faith, Romans 8)" style={inputStyle} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for the group (optional)" rows={2} style={{ ...inputStyle, resize: 'none' }} />

      {error && <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        style={{ width: '100%', minHeight: 48, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, borderRadius: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontSize: 15 }}
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
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', paddingBottom: 96 }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white' }}>Sermons</h1>
          {isAdmin && (
            <button
              onClick={() => { setShowAdminPanel(p => !p); setTab('schedule') }}
              style={{ fontSize: 13, fontWeight: 500, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}
            >
              {showAdminPanel ? 'Close' : '+ Schedule'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 4, gap: 4 }}>
          {(['today', 'schedule'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: tab === t ? 'white' : 'transparent',
                color: tab === t ? '#111111' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {t === 'today' ? "Today's Sermon" : 'Schedule'}
            </button>
          ))}
        </div>

        {/* Admin panel */}
        {isAdmin && showAdminPanel && tab === 'schedule' && (
          <AdminSchedulePanel curricula={curricula} onSaved={onAdminSaved} />
        )}

        {/* TODAY TAB */}
        {tab === 'today' && (
          <>
            {!todaySermon ? (
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🎙️</p>
                <p style={{ fontWeight: 600, color: 'white', marginBottom: 8 }}>No sermon scheduled today</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
                  {isAdmin ? 'Use the Schedule tab to add one.' : 'Check back soon.'}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formatSermonDate(todaySermon.schedule_date)}
                  </p>
                </div>
                <SermonCard
                  sermon={todaySermon}
                  isAdmin={isAdmin}
                  onDeleted={() => deleteSermon(todaySermon.id)}
                />
                {userId && (
                  <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 20 }}>
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
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
                <p style={{ fontWeight: 600, color: 'white', marginBottom: 8 }}>No sermons scheduled yet</p>
                {isAdmin && (
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Click &quot;+ Schedule&quot; to add one.</p>
                )}
              </div>
            )}
            {scheduleSermons.map(sermon => (
              <div key={sermon.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: sermon.schedule_date === today ? '#6C63FF' : 'rgba(255,255,255,0.3)' }}>
                  {formatSermonDate(sermon.schedule_date)}
                  {sermon.schedule_date === today && (
                    <span style={{ marginLeft: 6, color: '#6C63FF' }}>· Today</span>
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
