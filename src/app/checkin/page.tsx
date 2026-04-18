'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CheckIn } from '@/lib/types'
import { calculateStreak, getNewMilestone, milestoneMessage } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

type VisibilityType = 'everyone' | 'specific' | 'one_person'

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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            minHeight: 52,
            padding: '10px 8px',
            borderRadius: 14,
            border: value === opt.value ? '1px solid #6C63FF' : '1px solid #2A2A2A',
            backgroundColor: value === opt.value ? 'rgba(108,99,255,0.15)' : '#1A1A1A',
            color: value === opt.value ? '#A09AF8' : 'rgba(255,255,255,0.6)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            transition: 'all 0.15s',
          }}
        >
          {opt.emoji && <span style={{ fontSize: 16 }}>{opt.emoji}</span>}
          <span style={{ lineHeight: 1.2, textAlign: 'center' }}>{opt.label}</span>
        </button>
      ))}
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

  // Form state
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const today = todayToronto()

      const [checkInRes, membersRes, profileRes] = await Promise.all([
        supabase
          .from('check_ins')
          .select('*')
          .eq('user_id', user.id)
          .eq('check_in_date', today)
          .single(),
        supabase.from('profiles').select('*').neq('id', user.id).order('full_name'),
        supabase.from('profiles').select('default_visibility').eq('id', user.id).single(),
      ])

      setMembers(membersRes.data ?? [])

      // Pre-select default visibility from profile (only when no existing check-in)
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
      const { error } = await supabase
        .from('check_ins')
        .update(payload)
        .eq('id', existingCheckIn.id)
      if (error) { setError(error.message); setSaving(false); return }
      checkInId = existingCheckIn.id
    } else {
      // Always pass check_in_date explicitly — DB default is current_date in UTC
      // which is wrong for Toronto users after 8pm ET.
      const { data, error } = await supabase
        .from('check_ins')
        .insert({ ...payload, check_in_date: todayToronto() })
        .select('id')
        .single()
      if (error || !data) { setError(error?.message ?? 'Failed to save'); setSaving(false); return }
      checkInId = data.id
    }

    // Handle visibility grants
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

    // Send support notifications fire-and-forget (don't block redirect)
    if (supportRequested) {
      fetch('/api/notify-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_in_id: checkInId }),
      }).catch(() => {})
    }

    // Check for streak milestone
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

  const cardStyle = {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    border: '1px solid #2A2A2A',
    padding: 20,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 12,
  }

  const sectionTitleStyle = {
    fontWeight: 600,
    color: 'white',
    fontSize: 15,
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
      </div>
    )
  }

  if (milestone) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: 448, backgroundColor: '#1A1A1A', borderRadius: 24, border: '1px solid #2A2A2A', padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>Milestone reached!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{milestone}</p>
          <button
            onClick={() => router.push('/')}
            style={{ width: '100%', minHeight: 52, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, fontSize: 16, borderRadius: 14, border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  if (existingCheckIn && !editing) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', paddingBottom: 96 }}>
        <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Today&apos;s check-in</h1>
            <button
              onClick={() => { populateFormFromCheckIn(existingCheckIn); setEditing(true) }}
              style={{ minHeight: 44, padding: '0 16px', fontSize: 14, fontWeight: 500, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Edit
            </button>
          </div>
          <div style={cardStyle}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>You already checked in today. Tap Edit to update it.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{ minHeight: 52, backgroundColor: '#2A2A2A', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 15, borderRadius: 14, border: 'none', cursor: 'pointer' }}
          >
            Back to home
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', paddingBottom: 96 }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white' }}>
            {editing ? 'Update your check-in' : 'How are you today?'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 4, fontSize: 14 }}>
            Be honest. This is a safe space.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Spiritual life */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Spiritual life</h2>
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
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Time in the Word</h2>
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
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Prayer life</h2>
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

          {/* Emotional state */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Emotionally</h2>
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

          {/* Physical state */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Physically</h2>
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
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>A little more (optional)</h2>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                Anything you&apos;re struggling with?
              </label>
              <textarea
                value={struggles}
                onChange={(e) => setStruggles(e.target.value)}
                placeholder="Share as much or as little as you like…"
                rows={3}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                Something you&apos;re grateful for?
              </label>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Big or small, it counts…"
                rows={3}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                Anything else on your mind?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Whatever you want to share…"
                rows={3}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>
          </div>

          {/* Support toggle */}
          <div style={{ ...cardStyle, gap: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, cursor: 'pointer', minHeight: 44 }}>
              <div>
                <p style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>I&apos;d like someone to reach out</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Let your group know you could use support.</p>
              </div>
              <button
                type="button"
                onClick={() => setSupportRequested(!supportRequested)}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: supportRequested ? '#6C63FF' : '#2A2A2A',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: supportRequested ? 26 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </label>
          </div>

          {/* Visibility */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Who can see this?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { value: 'everyone', label: 'Everyone in the group', emoji: '👥' },
                { value: 'specific', label: 'Specific people', emoji: '👤' },
                { value: 'one_person', label: 'Just one person', emoji: '🤫' },
              ] as { value: VisibilityType; label: string; emoji: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  style={{
                    minHeight: 48,
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: visibility === opt.value ? '1px solid #6C63FF' : '1px solid #2A2A2A',
                    backgroundColor: visibility === opt.value ? 'rgba(108,99,255,0.15)' : '#111111',
                    color: visibility === opt.value ? '#A09AF8' : 'rgba(255,255,255,0.6)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {(visibility === 'specific' || visibility === 'one_person') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                  {visibility === 'one_person' ? 'Choose one person' : 'Choose people'}:
                </p>
                {members.map((m) => (
                  <label
                    key={m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, cursor: 'pointer' }}
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
                            e.target.checked
                              ? [...prev, m.id]
                              : prev.filter((id) => id !== m.id)
                          )
                        }
                      }}
                      style={{ width: 16, height: 16, accentColor: '#6C63FF', padding: 0, borderRadius: 4 }}
                    />
                    <span style={{ fontSize: 14, color: 'white' }}>
                      {m.display_name ?? m.full_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                minHeight: 56,
                backgroundColor: '#6C63FF',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 16,
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {saving ? 'Saving…' : editing ? 'Update check-in' : 'Submit check-in'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                width: '100%',
                minHeight: 52,
                backgroundColor: '#2A2A2A',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 500,
                fontSize: 15,
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
              }}
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
