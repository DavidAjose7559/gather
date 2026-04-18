'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CheckIn } from '@/lib/types'
import { calculateStreak, getNewMilestone, milestoneMessage } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

type VisibilityType = 'everyone' | 'specific' | 'one_person'

const AVATAR_COLORS = ['#FF4D4D', '#FF9500', '#4CAF50', '#6C63FF', '#00BCD4', '#E91E63']
function avatarColor(name: string): string {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', marginBottom: '8px' }}>
      {children}
    </p>
  )
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="min-h-[52px] px-2 py-3 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: selected ? 'rgba(108, 99, 255, 0.15)' : '#1A1A1A',
              border: selected ? '1.5px solid #6C63FF' : '1px solid #333333',
              color: selected ? '#FFFFFF' : '#A0A0A0',
              fontWeight: selected ? 500 : 400,
              fontSize: '14px',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function CheckInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [milestone, setMilestone] = useState<string | null>(null)
  const [existingCheckIn, setExistingCheckIn] = useState<CheckIn | null>(null)
  const [editing, setEditing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState('')
  const [members, setMembers] = useState<Profile[]>([])

  const [spiritualLife, setSpiritualLife] = useState<CheckIn['spiritual_life']>(null)
  const [wordTime, setWordTime] = useState<CheckIn['word_time']>(null)
  const [prayerLife, setPrayerLife] = useState<CheckIn['prayer_life']>(null)
  const [emotionalState, setEmotionalState] = useState<CheckIn['emotional_state']>(null)
  const [physicalState, setPhysicalState] = useState<CheckIn['physical_state']>(null)
  const [struggles, setStruggles] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [notes, setNotes] = useState('')
  const [supportRequested, setSupportRequested] = useState(false)
  const [visibility, setVisibility] = useState<VisibilityType>('everyone')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const today = todayToronto()
      const [checkInRes, membersRes, profileRes] = await Promise.all([
        supabase.from('check_ins').select('*').eq('user_id', user.id).eq('check_in_date', today).single(),
        supabase.from('profiles').select('*').neq('id', user.id).order('full_name'),
        supabase.from('profiles').select('default_visibility, full_name, display_name').eq('id', user.id).single(),
      ])

      setMembers(membersRes.data ?? [])

      if (profileRes.data) {
        setCurrentUserName(profileRes.data.display_name ?? profileRes.data.full_name)
        if (!checkInRes.data) setVisibility(profileRes.data.default_visibility as VisibilityType ?? 'everyone')
      }

      if (checkInRes.data) {
        const c = checkInRes.data as CheckIn
        setExistingCheckIn(c)
        setSpiritualLife(c.spiritual_life)
        setWordTime(c.word_time)
        setPrayerLife(c.prayer_life)
        setEmotionalState(c.emotional_state)
        setPhysicalState(c.physical_state)
        setStruggles(c.struggles ?? '')
        setGratitude(c.gratitude ?? '')
        setNotes(c.notes ?? '')
        setSupportRequested(c.support_requested)
        setVisibility(c.visibility_type as VisibilityType)
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function populateFormFromCheckIn(c: CheckIn) {
    setSpiritualLife(c.spiritual_life); setWordTime(c.word_time); setPrayerLife(c.prayer_life)
    setEmotionalState(c.emotional_state); setPhysicalState(c.physical_state)
    setStruggles(c.struggles ?? ''); setGratitude(c.gratitude ?? ''); setNotes(c.notes ?? '')
    setSupportRequested(c.support_requested); setVisibility(c.visibility_type as VisibilityType)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return
    setSaving(true)
    setError(null)

    const payload = {
      user_id: currentUserId,
      spiritual_life: spiritualLife,
      word_time: wordTime,
      prayer_life: prayerLife,
      emotional_state: emotionalState,
      physical_state: physicalState,
      struggles: struggles || null,
      gratitude: gratitude || null,
      notes: notes || null,
      support_requested: supportRequested,
      visibility_type: visibility,
    }

    let checkInId: string

    if (existingCheckIn) {
      const { error } = await supabase.from('check_ins').update(payload).eq('id', existingCheckIn.id)
      if (error) { setError(error.message); setSaving(false); return }
      checkInId = existingCheckIn.id
    } else {
      const { data, error } = await supabase
        .from('check_ins').insert({ ...payload, check_in_date: todayToronto() }).select('id').single()
      if (error || !data) { setError(error?.message ?? 'Failed to save'); setSaving(false); return }
      checkInId = data.id
    }

    if (visibility === 'specific' || visibility === 'one_person') {
      await supabase.from('visibility_grants').delete().eq('check_in_id', checkInId)
      if (selectedMembers.length > 0) {
        await supabase.from('visibility_grants').insert(selectedMembers.map((uid) => ({ check_in_id: checkInId, granted_to: uid })))
      }
    } else {
      await supabase.from('visibility_grants').delete().eq('check_in_id', checkInId)
    }

    if (supportRequested) {
      fetch('/api/notify-support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check_in_id: checkInId }) }).catch(() => {})
    }

    const ninetyDaysAgoCursor = new Date()
    ninetyDaysAgoCursor.setDate(ninetyDaysAgoCursor.getDate() - 90)
    const { data: history } = await supabase.from('check_ins').select('check_in_date').eq('user_id', currentUserId).gte('check_in_date', formatDateToronto(ninetyDaysAgoCursor)).order('check_in_date', { ascending: false })

    if (history) {
      const streak = calculateStreak(history)
      const hit = getNewMilestone(streak, currentUserId)
      if (hit) { setMilestone(milestoneMessage(hit)); setSaving(false); return }
    }

    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <p style={{ color: '#606060' }}>Loading…</p>
      </div>
    )
  }

  if (milestone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center flex flex-col gap-4" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          <div style={{ fontSize: '52px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>Milestone reached!</h2>
          <p style={{ color: '#A0A0A0', lineHeight: 1.6 }}>{milestone}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full min-h-[52px] rounded-xl text-white"
            style={{ background: '#6C63FF', fontWeight: 600, fontSize: '16px' }}
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  if (existingCheckIn && !editing) {
    const initials = (() => {
      const parts = currentUserName.trim().split(' ')
      return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : currentUserName.slice(0, 2)
    })()
    return (
      <div className="min-h-screen pb-24" style={{ background: '#0A0A0A' }}>
        <div className="max-w-md mx-auto px-4 py-10 flex flex-col gap-6">
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>Today&apos;s check-in</h1>
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold uppercase text-white"
              style={{ background: avatarColor(currentUserName) }}
            >
              {initials}
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#4CAF50">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>Checked in today</p>
              </div>
              <p style={{ fontSize: '14px', color: '#A0A0A0' }}>Tap Edit to update your check-in.</p>
            </div>
            <button
              onClick={() => { populateFormFromCheckIn(existingCheckIn); setEditing(true) }}
              className="min-h-[48px] px-8 rounded-xl hover:opacity-80"
              style={{ background: '#2A2A2A', color: '#6C63FF', fontWeight: 600, fontSize: '15px', border: '1px solid #333333' }}
            >
              Edit check-in
            </button>
          </div>
          <button
            onClick={() => router.push('/')}
            className="min-h-[48px] rounded-xl hover:opacity-80"
            style={{ background: '#1A1A1A', color: '#A0A0A0', fontWeight: 500, fontSize: '15px', border: '1px solid #333333' }}
          >
            Back to home
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const textareaStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    lineHeight: '1.5',
    resize: 'none' as const,
    borderRadius: '12px',
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#0A0A0A' }}>
      <div className="max-w-md mx-auto px-4 py-10 flex flex-col gap-8">
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            {editing ? 'Update your check-in' : 'How are you today?'}
          </h1>
          <p style={{ fontSize: '15px', color: '#606060' }}>Be honest. This is a safe space.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          <div>
            <SectionLabel>Spiritual life</SectionLabel>
            <OptionGrid options={[{ value: 'strong', label: 'Strong' }, { value: 'okay', label: 'Okay' }, { value: 'struggling', label: 'Struggling' }]} value={spiritualLife} onChange={setSpiritualLife} />
          </div>

          <div>
            <SectionLabel>Time in the Word</SectionLabel>
            <OptionGrid options={[{ value: 'yes', label: 'In the Word' }, { value: 'a_little', label: 'A little' }, { value: 'no', label: 'Not today' }]} value={wordTime} onChange={setWordTime} />
          </div>

          <div>
            <SectionLabel>Prayer life</SectionLabel>
            <OptionGrid options={[{ value: 'strong', label: 'Strong' }, { value: 'somewhat', label: 'Somewhat' }, { value: 'weak', label: 'Weak' }]} value={prayerLife} onChange={setPrayerLife} />
          </div>

          <div>
            <SectionLabel>Emotionally</SectionLabel>
            <OptionGrid options={[
              { value: 'joyful', label: 'Joyful' }, { value: 'peaceful', label: 'Peaceful' }, { value: 'okay', label: 'Okay' },
              { value: 'anxious', label: 'Anxious' }, { value: 'overwhelmed', label: 'Overwhelmed' }, { value: 'low', label: 'Low' },
            ]} value={emotionalState} onChange={setEmotionalState} />
          </div>

          <div>
            <SectionLabel>Physically</SectionLabel>
            <OptionGrid options={[
              { value: 'good', label: 'Good' }, { value: 'tired', label: 'Tired' },
              { value: 'low_energy', label: 'Low energy' }, { value: 'sick', label: 'Sick' },
            ]} value={physicalState} onChange={setPhysicalState} />
          </div>

          <div className="flex flex-col gap-5">
            <SectionLabel>A little more <span style={{ color: '#606060', fontWeight: 400 }}>(optional)</span></SectionLabel>
            {[
              { val: struggles, set: setStruggles, label: "Anything you're struggling with?", ph: 'Share as much or as little as you like…' },
              { val: gratitude, set: setGratitude, label: "Something you're grateful for?", ph: 'Big or small, it counts…' },
              { val: notes, set: setNotes, label: 'Anything else on your mind?', ph: 'Whatever you want to share…' },
            ].map(({ val, set, label, ph }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#A0A0A0', marginBottom: '8px' }}>{label}</label>
                <textarea value={val} onChange={(e) => set(e.target.value)} placeholder={ph} rows={3} style={textareaStyle} />
              </div>
            ))}
          </div>

          {/* Support toggle */}
          <div
            className="flex items-center justify-between gap-4 px-4 py-4 rounded-2xl"
            style={{ background: '#1A1A1A', border: '1px solid #333333' }}
          >
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#FFFFFF' }}>I&apos;d like someone to reach out</p>
              <p style={{ fontSize: '13px', color: '#A0A0A0', marginTop: '2px' }}>Let your group know you could use support.</p>
            </div>
            <button
              type="button"
              onClick={() => setSupportRequested(!supportRequested)}
              className="flex-shrink-0 rounded-full"
              style={{
                width: '50px', height: '28px', position: 'relative',
                background: supportRequested ? '#6C63FF' : '#333333',
              }}
            >
              <span
                className="absolute rounded-full bg-white"
                style={{
                  width: '22px', height: '22px', top: '3px', left: '3px',
                  transform: supportRequested ? 'translateX(22px)' : 'translateX(0)',
                  transition: 'transform 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </button>
          </div>

          {/* Visibility */}
          <div>
            <SectionLabel>Who can see this?</SectionLabel>
            <div className="flex flex-col gap-2">
              {([
                { value: 'everyone', label: 'Everyone in the group', sub: 'Visible to all members' },
                { value: 'specific', label: 'Specific people', sub: 'Choose who sees this' },
                { value: 'one_person', label: 'Just one person', sub: 'Private to one person' },
              ] as { value: VisibilityType; label: string; sub: string }[]).map((opt) => {
                const selected = visibility === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className="min-h-[56px] px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? 'rgba(108, 99, 255, 0.1)' : '#1A1A1A',
                      border: selected ? '1px solid #6C63FF' : '1px solid #333333',
                      borderLeft: selected ? '3px solid #6C63FF' : '1px solid #333333',
                    }}
                  >
                    <p style={{ fontSize: '15px', fontWeight: selected ? 500 : 400, color: selected ? '#FFFFFF' : '#A0A0A0' }}>{opt.label}</p>
                    <p style={{ fontSize: '12px', color: selected ? '#A0A0A0' : '#606060' }}>{opt.sub}</p>
                  </button>
                )
              })}
            </div>

            {(visibility === 'specific' || visibility === 'one_person') && (
              <div className="flex flex-col gap-2 mt-3">
                <p style={{ fontSize: '13px', color: '#A0A0A0' }}>
                  {visibility === 'one_person' ? 'Choose one person:' : 'Choose people:'}
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #333333', background: '#1A1A1A' }}>
                  {members.map((m, i) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 px-4 min-h-[52px] cursor-pointer"
                      style={i > 0 ? { borderTop: '1px solid #2A2A2A' } : {}}
                    >
                      <input
                        type={visibility === 'one_person' ? 'radio' : 'checkbox'}
                        name="member-select"
                        checked={selectedMembers.includes(m.id)}
                        onChange={(e) => {
                          if (visibility === 'one_person') {
                            setSelectedMembers(e.target.checked ? [m.id] : [])
                          } else {
                            setSelectedMembers((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))
                          }
                        }}
                        style={{ accentColor: '#6C63FF', width: '18px', height: '18px' }}
                      />
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold uppercase text-white flex-shrink-0"
                        style={{ background: avatarColor(m.display_name ?? m.full_name) }}
                      >
                        {(m.display_name ?? m.full_name)[0]}
                      </div>
                      <span style={{ fontSize: '15px', color: '#FFFFFF' }}>{m.display_name ?? m.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl px-4 py-3" style={{ fontSize: '14px', color: '#FF4D4D', background: '#2E1212', border: '1px solid #4A1F1F' }}>{error}</p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl text-white disabled:opacity-50"
              style={{ background: '#6C63FF', fontWeight: 600, fontSize: '16px', minHeight: '56px' }}
            >
              {saving ? 'Saving…' : editing ? 'Update check-in' : 'Check in'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full min-h-[48px] rounded-xl hover:opacity-80"
              style={{ background: '#1A1A1A', color: '#A0A0A0', fontWeight: 500, fontSize: '15px', border: '1px solid #333333' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <BottomNav />
    </div>
  )
}
