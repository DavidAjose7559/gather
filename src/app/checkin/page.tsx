'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CheckIn } from '@/lib/types'
import { calculateStreak, getNewMilestone, milestoneMessage } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

type VisibilityType = 'everyone' | 'specific' | 'one_person'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A8A29E' }}>
      {children}
    </p>
  )
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; emoji?: string }[]
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
            className="min-h-[48px] px-2 py-2.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
            style={{
              background: selected ? '#EEF0FB' : '#FFFFFF',
              border: selected ? '1.5px solid #5B4FCF' : '1px solid #E8E4DE',
              color: selected ? '#5B4FCF' : '#6B6560',
              fontWeight: selected ? 500 : 400,
              fontSize: '13px',
            }}
          >
            {opt.emoji && <span style={{ fontSize: '16px' }}>{opt.emoji}</span>}
            <span className="leading-tight text-center">{opt.label}</span>
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
        supabase.from('profiles').select('default_visibility').eq('id', user.id).single(),
      ])

      setMembers(membersRes.data ?? [])

      if (!checkInRes.data && profileRes.data?.default_visibility) {
        setVisibility(profileRes.data.default_visibility as VisibilityType)
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
        .from('check_ins')
        .insert({ ...payload, check_in_date: todayToronto() })
        .select('id')
        .single()
      if (error || !data) { setError(error?.message ?? 'Failed to save'); setSaving(false); return }
      checkInId = data.id
    }

    if (visibility === 'specific' || visibility === 'one_person') {
      await supabase.from('visibility_grants').delete().eq('check_in_id', checkInId)
      if (selectedMembers.length > 0) {
        await supabase.from('visibility_grants').insert(
          selectedMembers.map((uid) => ({ check_in_id: checkInId, granted_to: uid }))
        )
      }
    } else {
      await supabase.from('visibility_grants').delete().eq('check_in_id', checkInId)
    }

    if (supportRequested) {
      fetch('/api/notify-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_in_id: checkInId }),
      }).catch(() => {})
    }

    const ninetyDaysAgoCursor = new Date()
    ninetyDaysAgoCursor.setDate(ninetyDaysAgoCursor.getDate() - 90)
    const { data: history } = await supabase
      .from('check_ins')
      .select('check_in_date')
      .eq('user_id', currentUserId)
      .gte('check_in_date', formatDateToronto(ninetyDaysAgoCursor))
      .order('check_in_date', { ascending: false })

    if (history) {
      const streak = calculateStreak(history)
      const hit = getNewMilestone(streak, currentUserId)
      if (hit) {
        setMilestone(milestoneMessage(hit))
        setSaving(false)
        return
      }
    }

    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF9F7' }}>
        <p style={{ color: '#A8A29E' }}>Loading…</p>
      </div>
    )
  }

  if (milestone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#FAF9F7' }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center flex flex-col gap-4" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
          <div style={{ fontSize: '48px' }}>🎉</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1714' }}>Milestone reached!</h2>
          <p style={{ color: '#6B6560', lineHeight: 1.6 }}>{milestone}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full min-h-[48px] rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 500, fontSize: '15px' }}
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  if (existingCheckIn && !editing) {
    return (
      <div className="min-h-screen pb-24" style={{ background: '#FAF9F7' }}>
        <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1A1714' }}>Today&apos;s check-in</h1>
            <button
              onClick={() => { populateFormFromCheckIn(existingCheckIn); setEditing(true) }}
              className="min-h-[44px] px-4 hover:opacity-70"
              style={{ fontSize: '14px', fontWeight: 500, color: '#5B4FCF' }}
            >
              Edit
            </button>
          </div>
          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
            <p style={{ color: '#6B6560', fontSize: '14px' }}>You already checked in today. Tap Edit to update it.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="min-h-[48px] rounded-xl transition-opacity hover:opacity-80"
            style={{ background: '#F5F3EF', color: '#1A1714', fontWeight: 500, fontSize: '15px', border: '1px solid #E8E4DE' }}
          >
            Back to home
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FAF9F7' }}>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-8">
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1A1714' }}>
          {editing ? 'Update your check-in' : 'How are you today?'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* Spiritual life */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Spiritual life</SectionLabel>
            <OptionGrid
              options={[
                { value: 'strong', label: 'Strong', emoji: '🔥' },
                { value: 'okay', label: 'Okay', emoji: '🙂' },
                { value: 'struggling', label: 'Struggling', emoji: '😔' },
              ]}
              value={spiritualLife}
              onChange={setSpiritualLife}
            />
          </div>

          {/* Word time */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Time in the Word</SectionLabel>
            <OptionGrid
              options={[
                { value: 'yes', label: 'Yes', emoji: '📖' },
                { value: 'a_little', label: 'A little', emoji: '✏️' },
                { value: 'no', label: 'Not today', emoji: '😬' },
              ]}
              value={wordTime}
              onChange={setWordTime}
            />
          </div>

          {/* Prayer life */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Prayer life</SectionLabel>
            <OptionGrid
              options={[
                { value: 'strong', label: 'Strong', emoji: '🙏' },
                { value: 'somewhat', label: 'Somewhat', emoji: '🤲' },
                { value: 'weak', label: 'Weak', emoji: '😶' },
              ]}
              value={prayerLife}
              onChange={setPrayerLife}
            />
          </div>

          {/* Emotional */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Emotionally</SectionLabel>
            <OptionGrid
              options={[
                { value: 'joyful', label: 'Joyful', emoji: '😄' },
                { value: 'peaceful', label: 'Peaceful', emoji: '😌' },
                { value: 'okay', label: 'Okay', emoji: '🙂' },
                { value: 'anxious', label: 'Anxious', emoji: '😰' },
                { value: 'overwhelmed', label: 'Overwhelmed', emoji: '😩' },
                { value: 'low', label: 'Low', emoji: '😞' },
              ]}
              value={emotionalState}
              onChange={setEmotionalState}
            />
          </div>

          {/* Physical */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Physically</SectionLabel>
            <OptionGrid
              options={[
                { value: 'good', label: 'Good', emoji: '💪' },
                { value: 'tired', label: 'Tired', emoji: '😴' },
                { value: 'low_energy', label: 'Low energy', emoji: '🪫' },
                { value: 'sick', label: 'Sick', emoji: '🤒' },
              ]}
              value={physicalState}
              onChange={setPhysicalState}
            />
          </div>

          {/* Text fields */}
          <div className="flex flex-col gap-5">
            <SectionLabel>A little more <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: '#A8A29E' }}>(optional)</span></SectionLabel>
            {[
              { val: struggles, set: setStruggles, label: "Anything you're struggling with?", ph: 'Share as much or as little as you like…' },
              { val: gratitude, set: setGratitude, label: 'Something you\'re grateful for?', ph: 'Big or small, it counts…' },
              { val: notes, set: setNotes, label: 'Anything else on your mind?', ph: 'Whatever you want to share…' },
            ].map(({ val, set, label, ph }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B6560', marginBottom: '6px' }}>{label}</label>
                <textarea
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  rows={3}
                  className="w-full rounded-xl resize-none"
                  style={{
                    background: '#F5F3EF',
                    border: '1px solid #E8E4DE',
                    padding: '12px 14px',
                    fontSize: '15px',
                    color: '#1A1714',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Support toggle */}
          <div className="flex items-center justify-between gap-4 min-h-[44px]">
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#1A1714' }}>I&apos;d like someone to reach out</p>
              <p style={{ fontSize: '13px', color: '#6B6560', marginTop: '2px' }}>Let your group know you could use support.</p>
            </div>
            <button
              type="button"
              onClick={() => setSupportRequested(!supportRequested)}
              className="flex-shrink-0 rounded-full transition-colors"
              style={{
                width: '48px', height: '26px',
                background: supportRequested ? '#5B4FCF' : '#D4D0CB',
                position: 'relative',
              }}
            >
              <span
                className="absolute rounded-full bg-white transition-transform"
                style={{
                  width: '20px', height: '20px',
                  top: '3px', left: '3px',
                  transform: supportRequested ? 'translateX(22px)' : 'translateX(0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            </button>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-3">
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
                    className="min-h-[52px] px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? '#EEF0FB' : '#FFFFFF',
                      border: selected ? '1px solid #5B4FCF' : '1px solid #E8E4DE',
                      borderLeft: selected ? '3px solid #5B4FCF' : '1px solid #E8E4DE',
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: selected ? 500 : 400, color: selected ? '#5B4FCF' : '#1A1714' }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: '12px', color: selected ? '#5B4FCF' : '#6B6560', opacity: 0.8 }}>{opt.sub}</p>
                  </button>
                )
              })}
            </div>

            {(visibility === 'specific' || visibility === 'one_person') && (
              <div className="flex flex-col gap-2 mt-1">
                <p style={{ fontSize: '13px', color: '#6B6560' }}>
                  {visibility === 'one_person' ? 'Choose one person:' : 'Choose people:'}
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E4DE', background: '#FFFFFF' }}>
                  {members.map((m, i) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 px-4 min-h-[48px] cursor-pointer"
                      style={i > 0 ? { borderTop: '1px solid #EBEBEB' } : {}}
                    >
                      <input
                        type={visibility === 'one_person' ? 'radio' : 'checkbox'}
                        name="member-select"
                        checked={selectedMembers.includes(m.id)}
                        onChange={(e) => {
                          if (visibility === 'one_person') {
                            setSelectedMembers(e.target.checked ? [m.id] : [])
                          } else {
                            setSelectedMembers((prev) =>
                              e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                            )
                          }
                        }}
                        style={{ accentColor: '#5B4FCF', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#1A1714' }}>{m.display_name ?? m.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl px-3 py-2" style={{ fontSize: '14px', color: '#EF4444', background: '#FEF2F2' }}>{error}</p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[52px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 500, fontSize: '15px' }}
            >
              {saving ? 'Saving…' : editing ? 'Update check-in' : 'Submit check-in'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full min-h-[48px] rounded-xl transition-opacity hover:opacity-80"
              style={{ background: '#F5F3EF', color: '#6B6560', fontWeight: 500, fontSize: '15px', border: '1px solid #E8E4DE' }}
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
