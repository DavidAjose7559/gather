'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import type { CheckIn } from '@/lib/types'

const emotionalLabels: Record<string, string> = {
  peaceful: 'Peaceful', okay: 'Okay', anxious: 'Anxious',
  overwhelmed: 'Overwhelmed', low: 'Feeling low', joyful: 'Joyful',
}
const spiritualLabels: Record<string, string> = {
  strong: 'Strong', okay: 'Okay', struggling: 'Struggling',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A8A29E', marginBottom: '8px' }}>
      {children}
    </p>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leavingGroup, setLeavingGroup] = useState(false)

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
        supabase.from('check_ins').select('check_in_date').eq('user_id', user.id).gte('check_in_date', ninetyDaysAgoStr).order('check_in_date', { ascending: false }),
        supabase.from('check_ins').select('*').eq('user_id', user.id).gte('check_in_date', formatDateToronto(thirtyDaysAgoCursor)).order('check_in_date', { ascending: false }),
      ])

      if (profileRes.data) {
        const p = profileRes.data
        setFullName(p.full_name)
        setDisplayName(p.display_name ?? '')
        setReminderEnabled(p.reminder_enabled ?? true)
        setDefaultVisibility(p.default_visibility ?? 'everyone')
      }

      setStreak(calculateStreak(historyRes.data ?? []))
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

    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      display_name: displayName.trim() || null,
      reminder_enabled: reminderEnabled,
      default_visibility: defaultVisibility,
    }).eq('id', userId)

    if (error) {
      setSaveError(error.message)
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    }
    setSaving(false)
  }

  async function leaveGroup() {
    if (!userId) return
    setLeavingGroup(true)
    await supabase.from('check_ins').delete().eq('user_id', userId)
    await supabase.from('prayer_requests').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const today = todayToronto()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF9F7' }}>
        <p style={{ fontSize: '14px', color: '#A8A29E' }}>Loading…</p>
      </div>
    )
  }

  const parts = fullName.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : fullName.slice(0, 2)
  const inputStyle = {
    background: '#F5F3EF',
    border: '1px solid #E8E4DE',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '15px',
    color: '#1A1714',
    width: '100%',
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FAF9F7' }}>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Avatar header */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold uppercase text-white"
            style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)' }}
          >
            {initials}
          </div>
          <div className="text-center">
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#1A1714' }}>{displayName || fullName}</p>
            <p style={{ fontSize: '13px', color: '#A8A29E', marginTop: '2px' }}>{email}</p>
          </div>
          {streak > 0 && (
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#FB923C' }}>🔥 {streak} day streak</span>
          )}
        </div>

        {/* Profile fields */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
          <SectionLabel>Your name</SectionLabel>
          <div className="flex flex-col gap-3">
            <div>
              <label style={{ fontSize: '13px', color: '#6B6560', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Full name
              </label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#6B6560', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Display name <span style={{ color: '#A8A29E', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Nickname your group sees"
                style={inputStyle}
              />
            </div>
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: '#F5F3EF' }}
            >
              <p style={{ fontSize: '13px', color: '#6B6560' }} className="truncate flex-1">{email}</p>
              <p style={{ fontSize: '12px', color: '#A8A29E', flexShrink: 0, marginLeft: '8px' }}>Contact admin to change</p>
            </div>
          </div>

          {saveError && (
            <p className="rounded-xl px-3 py-2" style={{ fontSize: '13px', color: '#EF4444', background: '#FEF2F2' }}>{saveError}</p>
          )}
          {saveSuccess && (
            <p className="rounded-xl px-3 py-2" style={{ fontSize: '13px', color: '#166534', background: '#DCFCE7' }}>Saved!</p>
          )}

          <button
            onClick={saveProfile}
            disabled={saving || !fullName.trim()}
            className="w-full min-h-[44px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 600, fontSize: '15px' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Check-in history */}
        <div>
          <SectionLabel>Your check-ins · last 30 days</SectionLabel>
          {checkIns.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#A8A29E' }}>No check-ins in the last 30 days.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
              {checkIns.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/checkin/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:opacity-70 transition-opacity"
                  style={i > 0 ? { borderTop: '1px solid #EBEBEB', display: 'flex' } : { display: 'flex' }}
                >
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1714' }}>
                      {new Date(c.check_in_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                      {c.check_in_date === today && (
                        <span style={{ fontSize: '12px', color: '#5B4FCF', fontWeight: 600, marginLeft: '6px' }}>today</span>
                      )}
                    </p>
                    {(c.emotional_state || c.spiritual_life) && (
                      <p style={{ fontSize: '12px', color: '#A8A29E', marginTop: '2px' }}>
                        {c.emotional_state ? emotionalLabels[c.emotional_state] : ''}
                        {c.emotional_state && c.spiritual_life ? ' · ' : ''}
                        {c.spiritual_life ? spiritualLabels[c.spiritual_life] : ''}
                      </p>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
          <div className="px-4 pt-4 pb-2">
            <SectionLabel>Settings</SectionLabel>
          </div>

          {/* Reminder toggle */}
          <div className="px-4 py-3 flex items-center justify-between gap-4" style={{ borderTop: '1px solid #EBEBEB' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1714' }}>Daily reminder emails</p>
              <p style={{ fontSize: '12px', color: '#A8A29E', marginTop: '2px' }}>A gentle nudge if you haven&apos;t checked in</p>
            </div>
            <button
              type="button"
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className="relative flex-shrink-0 transition-colors"
              style={{
                width: '44px', height: '24px', borderRadius: '12px',
                background: reminderEnabled ? '#5B4FCF' : '#D4D0CB',
              }}
            >
              <span
                className="absolute top-0.5 transition-transform"
                style={{
                  left: '2px',
                  width: '20px', height: '20px',
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  transform: reminderEnabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* Default visibility */}
          <div className="px-4 py-3 flex flex-col gap-2" style={{ borderTop: '1px solid #EBEBEB' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1714', marginBottom: '4px' }}>Default check-in visibility</p>
            {([
              { value: 'everyone', label: 'Everyone in the group' },
              { value: 'specific', label: 'Specific people' },
              { value: 'one_person', label: 'Just one person' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDefaultVisibility(opt.value)}
                className="min-h-[44px] px-4 rounded-xl text-left transition-all"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  background: defaultVisibility === opt.value ? '#EEF0FB' : '#F5F3EF',
                  color: defaultVisibility === opt.value ? '#5B4FCF' : '#6B6560',
                  border: `1px solid ${defaultVisibility === opt.value ? '#C7D0F8' : '#E8E4DE'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Save settings */}
          <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid #EBEBEB' }}>
            <button
              onClick={saveProfile}
              disabled={saving || !fullName.trim()}
              className="w-full min-h-[44px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 600, fontSize: '14px' }}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>

        {/* Leave group */}
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
          <SectionLabel>Leave group</SectionLabel>
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="min-h-[44px] px-4 rounded-xl text-left transition-opacity hover:opacity-70"
              style={{ fontSize: '14px', fontWeight: 500, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              Leave this group
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p style={{ fontSize: '14px', color: '#6B6560', lineHeight: 1.6 }}>
                Are you sure? This will remove your profile and check-in history. It cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={leaveGroup}
                  disabled={leavingGroup}
                  className="flex-1 min-h-[44px] rounded-xl text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: '#EF4444', fontWeight: 600, fontSize: '14px' }}
                >
                  {leavingGroup ? 'Leaving…' : 'Yes, leave group'}
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="min-h-[44px] px-5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ background: '#F5F3EF', color: '#6B6560', fontWeight: 500, fontSize: '14px', border: '1px solid #E8E4DE' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
