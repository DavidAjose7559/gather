'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayToronto, timeAgo } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import Image from 'next/image'
import type { SermonSchedule, SermonCurriculum, SermonDiscussion } from '@/lib/types'

type DiscussionWithProfile = SermonDiscussion & {
  profiles: { full_name: string; display_name: string | null } | null
}

const AVATAR_COLORS = ['#FF4D4D', '#FF9500', '#4CAF50', '#6C63FF', '#00BCD4', '#E91E63']
function avatarColor(name: string): string {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
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

function SermonCard({ sermon, isAdmin, onDeleted }: { sermon: SermonSchedule; isAdmin: boolean; onDeleted?: () => void }) {
  const imageUrl = sermon.episode_image_url
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
      {imageUrl && (
        <div className="relative w-full" style={{ height: '180px' }}>
          <Image src={imageUrl} alt={sermon.episode_title} fill className="object-cover" sizes="(max-width: 448px) 100vw, 448px" />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
        {sermon.theme && (
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {sermon.theme}
          </p>
        )}
        <p style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>{sermon.episode_title}</p>
        {sermon.episode_description && (
          <p className="line-clamp-3" style={{ fontSize: '14px', color: '#A0A0A0', lineHeight: 1.5 }}>{sermon.episode_description}</p>
        )}
        {sermon.notes && (
          <p className="rounded-xl px-3 py-2" style={{ fontSize: '13px', color: '#A89EFF', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', lineHeight: 1.5 }}>
            {sermon.notes}
          </p>
        )}
        {(sermon.episode_url || sermon.youtube_url) && (
          <div className="flex flex-wrap gap-2">
            {sermon.episode_url && (
              <a href={ensureAbsoluteUrl(sermon.episode_url)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl hover:opacity-80 transition-opacity"
                style={{ background: '#1DB954', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, padding: '9px 16px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </a>
            )}
            {sermon.youtube_url && (
              <a href={ensureAbsoluteUrl(sermon.youtube_url)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl hover:opacity-80 transition-opacity"
                style={{ background: '#FF4444', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, padding: '9px 16px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                </svg>
                YouTube
              </a>
            )}
          </div>
        )}
        {isAdmin && onDeleted && (
          <button onClick={onDeleted} className="text-left hover:opacity-70 transition-opacity" style={{ fontSize: '12px', color: '#606060' }}>
            Remove from schedule
          </button>
        )}
      </div>
    </div>
  )
}

function DiscussionSection({ sermon, userId, userDisplayName }: { sermon: SermonSchedule; userId: string; userDisplayName: string }) {
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_id: sermon.id, body }),
    })
    const d = await res.json()
    if (d.discussion) { setPosts(prev => [...prev, d.discussion]); setBody('') }
    setSubmitting(false)
  }

  async function deletePost(id: string) {
    await fetch(`/api/sermons/discussion?id=${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <p style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Discussion</p>
      {posts.length === 0 && (
        <p style={{ fontSize: '14px', color: '#606060' }}>No replies yet. Be the first to share a thought.</p>
      )}
      {posts.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          {posts.map((post, i) => {
            const name = post.profiles?.display_name ?? post.profiles?.full_name ?? 'Member'
            const isOwn = post.user_id === userId
            return (
              <div key={post.id} className="px-4 py-4 flex gap-3" style={i > 0 ? { borderTop: '1px solid #2A2A2A' } : {}}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 uppercase text-white" style={{ background: avatarColor(name) }}>
                  {name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF' }}>{name}</span>
                    <span style={{ fontSize: '12px', color: '#606060' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#A0A0A0', lineHeight: 1.5 }}>{post.body}</p>
                  {isOwn && (
                    <button onClick={() => deletePost(post.id)} className="hover:opacity-70 transition-opacity" style={{ fontSize: '12px', color: '#606060', marginTop: '4px' }}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`Reply as ${userDisplayName}…`}
          rows={2}
          className="flex-1 resize-none"
          style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '12px' }}
        />
        <button
          onClick={submit}
          disabled={!body.trim() || submitting}
          className="flex-shrink-0 rounded-xl text-white disabled:opacity-40 hover:opacity-90"
          style={{ background: '#6C63FF', fontWeight: 600, fontSize: '14px', padding: '0 18px' }}
        >
          Post
        </button>
      </div>
    </div>
  )
}

function AdminSchedulePanel({ curricula, onSaved }: { curricula: SermonCurriculum[]; onSaved: (sermon: SermonSchedule) => void }) {
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

  const inputStyle = { width: '100%', padding: '12px 14px', fontSize: '14px', borderRadius: '12px' }

  async function searchSpotify() {
    if (!spotifyQuery.trim()) return
    setSearchLoading(true); setSpotifyResults([])
    const res = await fetch(`/api/spotify/episodes?query=${encodeURIComponent(spotifyQuery)}`)
    const d = await res.json()
    setSpotifyResults(d.episodes ?? [])
    setSearchLoading(false)
  }

  async function createCurriculum() {
    if (!newCurrName.trim()) return
    setCreatingCurr(true)
    const res = await fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCurrName }) })
    const d = await res.json()
    if (d.curriculum) { setCurrList(prev => [d.curriculum, ...prev]); setCurriculumId(d.curriculum.id); setNewCurrName('') }
    setCreatingCurr(false)
  }

  async function save() {
    setError(null)
    if (!date) { setError('Date is required'); return }
    const title = source === 'spotify' ? selectedEpisode?.name : manualTitle
    if (!title?.trim()) { setError('Episode title is required'); return }
    setSaving(true)

    const payload: Record<string, unknown> = {
      schedule_date: date, source, episode_title: title.trim(),
      curriculum_id: curriculumId || null,
      theme: theme.trim() || null, notes: notes.trim() || null, youtube_url: youtubeUrl.trim() || null,
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

    const res = await fetch('/api/sermons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json()
    if (d.error) { setError(d.error) } else {
      onSaved(d.sermon)
      setSelectedEpisode(null); setManualTitle(''); setManualDesc(''); setManualImage('')
      setYoutubeUrl(''); setTheme(''); setNotes(''); setSpotifyQuery(''); setSpotifyResults([])
    }
    setSaving(false)
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '1px solid #6C63FF' }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Schedule a sermon</p>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '6px' }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '6px' }}>Series (optional)</label>
        <select value={curriculumId} onChange={e => setCurriculumId(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
          <option value="">None</option>
          {currList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2 mt-2">
          <input type="text" value={newCurrName} onChange={e => setNewCurrName(e.target.value)} placeholder="New series name…" style={{ ...inputStyle, width: 'auto', flex: 1 }} />
          <button onClick={createCurriculum} disabled={!newCurrName.trim() || creatingCurr} className="rounded-xl disabled:opacity-40 hover:opacity-80"
            style={{ background: '#6C63FF', color: '#FFFFFF', fontWeight: 600, fontSize: '13px', padding: '0 14px' }}>Add</button>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '6px' }}>Source</label>
        <div className="flex gap-2">
          {(['spotify', 'manual'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)} className="flex-1 rounded-xl transition-all"
              style={{ padding: '10px 0', fontSize: '13px', fontWeight: 500,
                background: source === s ? '#6C63FF' : '#2A2A2A', color: source === s ? '#FFFFFF' : '#A0A0A0',
                border: `1px solid ${source === s ? '#6C63FF' : '#333333'}` }}>
              {s === 'spotify' ? '🎵 Spotify' : '✍️ Manual'}
            </button>
          ))}
        </div>
      </div>

      {source === 'spotify' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input type="text" value={spotifyQuery} onChange={e => setSpotifyQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchSpotify()}
              placeholder="Search episodes…" style={{ ...inputStyle, width: 'auto', flex: 1 }} />
            <button onClick={searchSpotify} disabled={searchLoading || !spotifyQuery.trim()} className="rounded-xl disabled:opacity-40 hover:opacity-80 flex-shrink-0"
              style={{ background: '#1DB954', color: '#FFFFFF', fontWeight: 600, fontSize: '13px', padding: '0 14px' }}>
              {searchLoading ? '…' : 'Search'}
            </button>
          </div>
          {spotifyResults.length > 0 && (
            <div className="flex flex-col max-h-60 overflow-y-auto rounded-xl" style={{ border: '1px solid #333333' }}>
              {spotifyResults.map((ep, i) => (
                <button key={ep.id} onClick={() => setSelectedEpisode(ep)} className="flex items-center gap-3 p-2 text-left transition-all"
                  style={{ background: selectedEpisode?.id === ep.id ? 'rgba(108,99,255,0.15)' : '#1A1A1A', borderTop: i > 0 ? '1px solid #2A2A2A' : undefined }}>
                  {ep.images?.[0]?.url && <Image src={ep.images[0].url} alt={ep.name} width={36} height={36} className="rounded-lg flex-shrink-0 object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF' }} className="truncate">{ep.name}</p>
                    <p style={{ fontSize: '12px', color: '#606060' }}>{ep.release_date}</p>
                  </div>
                  {selectedEpisode?.id === ep.id && <span style={{ color: '#6C63FF', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
          {selectedEpisode && (
            <p className="rounded-xl px-3 py-2" style={{ fontSize: '13px', color: '#A89EFF', background: 'rgba(108,99,255,0.1)', fontWeight: 500 }}>
              Selected: {selectedEpisode.name}
            </p>
          )}
        </div>
      )}

      {source === 'manual' && (
        <div className="flex flex-col gap-2">
          <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Episode / sermon title *" style={inputStyle} />
          <textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="resize-none" style={inputStyle} />
          <input type="url" value={manualImage} onChange={e => setManualImage(e.target.value)} placeholder="Cover image URL (optional)" style={inputStyle} />
        </div>
      )}

      <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="YouTube URL (optional)" style={inputStyle} />
      <p style={{ fontSize: '12px', color: '#606060', marginTop: '-12px' }}>Paste the full URL including https://</p>
      <input type="text" value={theme} onChange={e => setTheme(e.target.value)} placeholder="Theme / tag (e.g. Faith, Romans 8)" style={inputStyle} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for the group (optional)" rows={2} className="resize-none" style={inputStyle} />

      {error && <p className="rounded-xl px-4 py-3" style={{ fontSize: '13px', color: '#FF4D4D', background: '#2E1212', border: '1px solid #4A1F1F' }}>{error}</p>}

      <button onClick={save} disabled={saving} className="w-full min-h-[52px] rounded-xl text-white disabled:opacity-50 hover:opacity-90"
        style={{ background: '#6C63FF', fontWeight: 600, fontSize: '15px' }}>
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
      if (idx >= 0) { const next = [...prev]; next[idx] = sermon; return next }
      return [...prev, sermon].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
    })
    if (sermon.schedule_date === today) setTodaySermon(sermon)
    setShowAdminPanel(false)
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
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>Sermon of the Day</h1>
          {isAdmin && (
            <button onClick={() => { setShowAdminPanel(p => !p); setTab('schedule') }}
              className="min-h-[44px] flex items-center hover:opacity-70"
              style={{ fontSize: '14px', fontWeight: 500, color: showAdminPanel ? '#606060' : '#6C63FF' }}>
              {showAdminPanel ? 'Close' : '+ Schedule'}
            </button>
          )}
        </div>

        {/* Dark pill tabs */}
        <div className="flex gap-2">
          {(['today', 'schedule'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="rounded-full transition-all"
              style={{
                padding: '8px 20px', fontSize: '14px', fontWeight: 500,
                background: tab === t ? '#FFFFFF' : '#1A1A1A',
                color: tab === t ? '#0A0A0A' : '#606060',
                border: `1px solid ${tab === t ? '#FFFFFF' : '#333333'}`,
              }}>
              {t === 'today' ? 'Today' : 'Schedule'}
            </button>
          ))}
        </div>

        {isAdmin && showAdminPanel && tab === 'schedule' && (
          <AdminSchedulePanel curricula={curricula} onSaved={onAdminSaved} />
        )}

        {tab === 'today' && (
          <>
            {!todaySermon ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#1A1A1A' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                  </svg>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginBottom: '6px' }}>No sermon scheduled today</p>
                <p style={{ fontSize: '14px', color: '#606060' }}>
                  {isAdmin ? 'Switch to Schedule to add one.' : 'Check back soon.'}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#606060', marginBottom: '-8px' }}>{formatSermonDate(todaySermon.schedule_date)}</p>
                <SermonCard sermon={todaySermon} isAdmin={isAdmin} onDeleted={() => deleteSermon(todaySermon.id)} />
                {userId && <DiscussionSection sermon={todaySermon} userId={userId} userDisplayName={userDisplayName} />}
              </>
            )}
          </>
        )}

        {tab === 'schedule' && (
          <>
            {scheduleSermons.length === 0 && !showAdminPanel && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#1A1A1A' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginBottom: '6px' }}>No sermons scheduled yet</p>
                {isAdmin && <p style={{ fontSize: '14px', color: '#606060' }}>Click &quot;+ Schedule&quot; to add one.</p>}
              </div>
            )}
            {scheduleSermons.map(sermon => (
              <div key={sermon.id} className="flex flex-col gap-2">
                <p style={{ fontSize: '13px', fontWeight: 600, color: sermon.schedule_date === today ? '#6C63FF' : '#606060' }}>
                  {formatSermonDate(sermon.schedule_date)}
                  {sermon.schedule_date === today && <span style={{ fontWeight: 400, color: '#606060' }}> · Today</span>}
                </p>
                <SermonCard sermon={sermon} isAdmin={isAdmin} onDeleted={() => deleteSermon(sermon.id)} />
              </div>
            ))}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
