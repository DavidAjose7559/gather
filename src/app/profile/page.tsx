'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import type { CheckIn } from '@/lib/types'

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

const emotionalLabels: Record<string, string> = {
  peaceful: 'Peaceful',
  okay: 'Okay',
  anxious: 'Anxious',
  overwhelmed: 'Overwhelmed',
  low: 'Feeling low',
  joyful: 'Joyful',
}

const spiritualLabels: Record<string, string> = {
  strong: 'Strong',
  okay: 'Okay',
  struggling: 'Struggling',
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leavingGroup, setLeavingGroup] = useState(false)
  const [editingName, setEditingName] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [defaultVisibility, setDefaultVisibility] = useState<'everyone' | 'specific' | 'one_person'>('everyone')
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [streak, setStreak] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? null)

      const ninetyDaysAgoCursor = new Date()
      ninetyDaysAgoCursor.setDate(ninetyDaysAgoCursor.getDate() - 90)
      const ninetyDaysAgoStr = formatDateToronto(ninetyDaysAgoCursor)

      const thirtyDaysAgoCursor = new Date()
      thirtyDaysAgoCursor.setDate(thirtyDaysAgoCursor.getDate() - 30)

      const [profileRes, historyRes, checkInListRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('check_ins')
          .select('check_in_date')
          .eq('user_id', user.id)
          .gte('check_in_date', ninetyDaysAgoStr)
          .order('check_in_date', { ascending: false }),
        supabase
          .from('check_ins')
          .select('*')
          .eq('user_id', user.id)
          .gte('check_in_date', formatDateToronto(thirtyDaysAgoCursor))
          .order('check_in_date', { ascending: false }),
      ])

      if (profileRes.data) {
        const p = profileRes.data
        setFullName(p.full_name)
        setDisplayName(p.display_name ?? '')
        setReminderEnabled(p.reminder_enabled ?? true)
        setDefaultVisibility(p.default_visibility ?? 'everyone')
      }

      const history = historyRes.data ?? []
      setStreak(calculateStreak(history))
      setCheckIns((checkInListRes.data ?? []) as CheckIn[])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile() {
    if (!userId || !fullName.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        display_name: displayName.trim() || null,
        reminder_enabled: reminderEnabled,
        default_visibility: defaultVisibility,
      })
      .eq('id', userId)

    if (error) {
      setSaveError(error.message)
    } else {
      setSaveSuccess(true)
      setEditingName(false)
      setTimeout(() => setSaveSuccess(false), 2500)
    }
    setSaving(false)
  }

  async function leaveGroup() {
    if (!userId) return
    setLeavingGroup(true)

    // Delete all user data, then profile, then sign out
    await supabase.from('check_ins').delete().eq('user_id', userId)
    await supabase.from('prayer_requests').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const today = todayToronto()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
      </div>
    )
  }

  const avatarColor = getAvatarColor(fullName)
  const initials = fullName.trim().split(' ').length >= 2
    ? `${fullName.trim().split(' ')[0][0]}${fullName.trim().split(' ').at(-1)![0]}`
    : fullName.slice(0, 2)

  const cardStyle = {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    border: '1px solid #2A2A2A',
    overflow: 'hidden' as const,
  }

  const rowStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '16px 20px',
    borderBottom: '1px solid #2A2A2A',
    minHeight: 60,
    gap: 12,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', paddingBottom: 96 }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white' }}>Account</h1>

        {/* Avatar + name card */}
        <div style={cardStyle}>
          {/* Avatar row */}
          <div style={{ ...rowStyle, borderBottom: editingName ? '1px solid #2A2A2A' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0, textTransform: 'uppercase' }}>
                {initials}
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'white', fontSize: 16 }}>{displayName || fullName}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{email}</p>
              </div>
            </div>
            <button
              onClick={() => setEditingName(v => !v)}
              style={{ fontSize: 14, fontWeight: 500, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              {editingName ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Inline edit form */}
          {editingName && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                  Display name <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nickname your group sees"
                  style={{ width: '100%' }}
                />
              </div>
              {saveError && (
                <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{saveError}</p>
              )}
              {saveSuccess && (
                <p style={{ fontSize: 13, color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 10, padding: '8px 12px' }}>Saved!</p>
              )}
              <button
                onClick={saveProfile}
                disabled={saving || !fullName.trim()}
                style={{ width: '100%', minHeight: 48, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, fontSize: 15, borderRadius: 12, border: 'none', cursor: saving || !fullName.trim() ? 'not-allowed' : 'pointer', opacity: saving || !fullName.trim() ? 0.5 : 1 }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>

        {/* Check-in history */}
        <div style={cardStyle}>
          <div style={{ ...rowStyle, borderBottom: checkIns.length > 0 ? '1px solid #2A2A2A' : 'none' }}>
            <h2 style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>Your check-ins</h2>
            {streak > 0 ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FF9500' }}>🔥 {streak} day streak</span>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Start a streak today</span>
            )}
          </div>

          {checkIns.length === 0 ? (
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No check-ins in the last 30 days.</p>
            </div>
          ) : (
            <div>
              {checkIns.map((c) => (
                <Link
                  key={c.id}
                  href={`/checkin/${c.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #222222', textDecoration: 'none' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>
                      {new Date(c.check_in_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                      {c.check_in_date === today && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: '#6C63FF', fontWeight: 700 }}>today</span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {c.emotional_state && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8, backgroundColor: 'rgba(108,99,255,0.15)', color: '#A09AF8', fontSize: 12, fontWeight: 500 }}>
                        {emotionalLabels[c.emotional_state]}
                      </span>
                    )}
                    {c.spiritual_life && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8, backgroundColor: '#2A2A2A', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500 }}>
                        {spiritualLabels[c.spiritual_life]}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div style={cardStyle}>
          {/* Section header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A2A' }}>
            <h2 style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>Settings</h2>
          </div>

          {/* Daily reminder toggle */}
          <div style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                🔔
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Daily reminders</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Gentle nudge if you haven&apos;t checked in</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReminderEnabled(!reminderEnabled)}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: 48,
                height: 26,
                borderRadius: 13,
                backgroundColor: reminderEnabled ? '#6C63FF' : '#2A2A2A',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: reminderEnabled ? 25 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </button>
          </div>

          {/* Default visibility */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A2A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,188,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                👁
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Default visibility</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { value: 'everyone', label: 'Everyone in the group', emoji: '👥' },
                { value: 'specific', label: 'Specific people', emoji: '👤' },
                { value: 'one_person', label: 'Just one person', emoji: '🤫' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDefaultVisibility(opt.value)}
                  style={{
                    minHeight: 44,
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: defaultVisibility === opt.value ? '1px solid #6C63FF' : '1px solid #2A2A2A',
                    backgroundColor: defaultVisibility === opt.value ? 'rgba(108,99,255,0.15)' : '#111111',
                    color: defaultVisibility === opt.value ? '#A09AF8' : 'rgba(255,255,255,0.5)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{opt.emoji}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save settings */}
          <div style={{ padding: '16px 20px' }}>
            {saveSuccess && (
              <p style={{ fontSize: 13, color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>Saved!</p>
            )}
            <button
              onClick={saveProfile}
              disabled={saving || !fullName.trim()}
              style={{ width: '100%', minHeight: 48, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, fontSize: 15, borderRadius: 12, border: 'none', cursor: saving || !fullName.trim() ? 'not-allowed' : 'pointer', opacity: saving || !fullName.trim() ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>

        {/* Sign out */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', paddingLeft: 4 }}>
            Signed in as {email}
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            style={{ width: '100%', minHeight: 52, backgroundColor: '#1A1A1A', color: 'white', fontWeight: 600, fontSize: 15, borderRadius: 14, border: '1px solid #333333', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>

        {/* Danger zone */}
        <div style={cardStyle}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A2A' }}>
            <h2 style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>Leave group</h2>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                style={{ minHeight: 44, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,77,77,0.3)', color: '#FF4D4D', fontSize: 14, fontWeight: 500, backgroundColor: 'rgba(255,77,77,0.08)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                Leave this group
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Are you sure? This will remove your profile and check-in history. It cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={leaveGroup}
                    disabled={leavingGroup}
                    style={{ flex: 1, minHeight: 44, backgroundColor: '#FF4D4D', color: 'white', fontWeight: 700, borderRadius: 12, fontSize: 14, border: 'none', cursor: leavingGroup ? 'not-allowed' : 'pointer', opacity: leavingGroup ? 0.5 : 1 }}
                  >
                    {leavingGroup ? 'Leaving…' : 'Yes, leave group'}
                  </button>
                  <button
                    onClick={() => setConfirmLeave(false)}
                    style={{ minHeight: 44, padding: '0 16px', backgroundColor: '#2A2A2A', color: 'rgba(255,255,255,0.6)', borderRadius: 12, fontSize: 14, border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
