'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import type { CheckIn } from '@/lib/types'

const AVATAR_COLORS = ['#FF4D4D', '#FF9500', '#4CAF50', '#6C63FF', '#00BCD4', '#E91E63']
function avatarColor(name: string): string {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

const emotionalLabels: Record<string, string> = {
  peaceful: 'Peaceful', okay: 'Okay', anxious: 'Anxious',
  overwhelmed: 'Overwhelmed', low: 'Feeling low', joyful: 'Joyful',
}
const spiritualLabels: Record<string, string> = {
  strong: 'Strong', okay: 'Okay', struggling: 'Struggling',
}

function SettingRow({ icon, iconBg, label, children }: { icon: React.ReactNode; iconBg: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]" style={{ borderTop: '1px solid #2A2A2A' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: '15px', color: '#FFFFFF', fontWeight: 400 }}>{label}</span>
      {children}
    </div>
  )
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
      const thirtyDaysAgoCursor = new Date()
      thirtyDaysAgoCursor.setDate(thirtyDaysAgoCursor.getDate() - 30)

      const [profileRes, historyRes, checkInListRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('check_ins').select('check_in_date').eq('user_id', user.id).gte('check_in_date', formatDateToronto(ninetyDaysAgoCursor)).order('check_in_date', { ascending: false }),
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
    setSaving(true); setSaveError(null); setSaveSuccess(false)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      display_name: displayName.trim() || null,
      reminder_enabled: reminderEnabled,
      default_visibility: defaultVisibility,
    }).eq('id', userId)
    if (error) { setSaveError(error.message) } else { setSaveSuccess(true); setEditingName(false); setTimeout(() => setSaveSuccess(false), 2500) }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <p style={{ color: '#606060' }}>Loading…</p>
      </div>
    )
  }

  const parts = fullName.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : fullName.slice(0, 2)
  const displayedName = displayName || fullName

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A0A' }}>
      <div className="max-w-md mx-auto px-4 pt-10 pb-8 flex flex-col gap-6">

        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>Account</h1>

        {/* Avatar + info */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold uppercase text-white flex-shrink-0"
              style={{ background: avatarColor(displayedName) }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }} className="truncate">{displayedName}</p>
              <p style={{ fontSize: '13px', color: '#606060', marginTop: '2px' }}>{email}</p>
              {streak >= 2 && (
                <p style={{ fontSize: '13px', color: '#FF9500', marginTop: '4px', fontWeight: 500 }}>🔥 {streak} day streak</p>
              )}
            </div>
            <button
              onClick={() => setEditingName((v) => !v)}
              className="flex-shrink-0 rounded-xl hover:opacity-70 transition-opacity"
              style={{ padding: '8px 14px', background: '#2A2A2A', color: '#A0A0A0', fontSize: '13px', fontWeight: 500, border: '1px solid #333333' }}
            >
              {editingName ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingName && (
            <div className="flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid #2A2A2A' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '6px' }}>Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '12px 14px', fontSize: '15px', borderRadius: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '6px' }}>
                  Display name <span style={{ color: '#606060', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nickname your group sees"
                  style={{ width: '100%', padding: '12px 14px', fontSize: '15px', borderRadius: '12px' }} />
              </div>
              {saveError && <p className="rounded-xl px-4 py-3" style={{ fontSize: '13px', color: '#FF4D4D', background: '#2E1212', border: '1px solid #4A1F1F' }}>{saveError}</p>}
              {saveSuccess && <p className="rounded-xl px-4 py-3" style={{ fontSize: '13px', color: '#4CAF50', background: '#1A2E1A', border: '1px solid #2D4A2D' }}>Saved!</p>}
              <button onClick={saveProfile} disabled={saving || !fullName.trim()} className="w-full min-h-[48px] rounded-xl text-white disabled:opacity-50 hover:opacity-90"
                style={{ background: '#6C63FF', fontWeight: 600, fontSize: '15px' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}
        </div>

        {/* Check-in history */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Check-in history · 30 days
          </p>
          {checkIns.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#606060' }}>No check-ins in the last 30 days.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
              {checkIns.map((c, i) => (
                <Link key={c.id} href={`/checkin/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:opacity-70 transition-opacity"
                  style={i > 0 ? { borderTop: '1px solid #2A2A2A', display: 'flex' } : { display: 'flex' }}>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}>
                      {new Date(c.check_in_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {c.check_in_date === today && <span style={{ fontSize: '12px', color: '#6C63FF', fontWeight: 600, marginLeft: '8px' }}>today</span>}
                    </p>
                    {(c.emotional_state || c.spiritual_life) && (
                      <p style={{ fontSize: '12px', color: '#606060', marginTop: '2px' }}>
                        {c.emotional_state ? emotionalLabels[c.emotional_state] : ''}
                        {c.emotional_state && c.spiritual_life ? ' · ' : ''}
                        {c.spiritual_life ? spiritualLabels[c.spiritual_life] : ''}
                      </p>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Settings</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>

            {/* Reminder toggle */}
            <SettingRow
              iconBg="rgba(255,77,77,0.2)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
              label="Daily reminders"
            >
              <button
                type="button"
                onClick={() => { setReminderEnabled(!reminderEnabled); setTimeout(saveProfile, 100) }}
                className="flex-shrink-0 rounded-full transition-all"
                style={{
                  width: '48px', height: '26px', position: 'relative',
                  background: reminderEnabled ? '#6C63FF' : '#333333',
                }}
              >
                <span className="absolute rounded-full bg-white" style={{
                  width: '20px', height: '20px', top: '3px', left: '3px',
                  transform: reminderEnabled ? 'translateX(22px)' : 'translateX(0)',
                  transition: 'transform 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </SettingRow>

            {/* Default visibility */}
            <div style={{ borderTop: '1px solid #2A2A2A' }}>
              <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(108,99,255,0.2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <span style={{ flex: 1, fontSize: '15px', color: '#FFFFFF' }}>Default visibility</span>
              </div>
              <div className="px-4 pb-3 flex flex-col gap-2">
                {([
                  { value: 'everyone', label: 'Everyone in the group' },
                  { value: 'specific', label: 'Specific people' },
                  { value: 'one_person', label: 'Just one person' },
                ] as const).map(opt => (
                  <button key={opt.value} type="button" onClick={() => setDefaultVisibility(opt.value)}
                    className="min-h-[44px] px-4 rounded-xl text-left transition-all hover:opacity-80"
                    style={{
                      fontSize: '14px', fontWeight: 500,
                      background: defaultVisibility === opt.value ? 'rgba(108,99,255,0.15)' : '#2A2A2A',
                      color: defaultVisibility === opt.value ? '#A89EFF' : '#A0A0A0',
                      border: `1px solid ${defaultVisibility === opt.value ? 'rgba(108,99,255,0.4)' : '#333333'}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
                <button onClick={saveProfile} disabled={saving || !fullName.trim()} className="w-full min-h-[44px] rounded-xl text-white disabled:opacity-50 hover:opacity-90 mt-1"
                  style={{ background: '#6C63FF', fontWeight: 600, fontSize: '14px' }}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Leave group */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#2A2A2A' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span style={{ flex: 1, fontSize: '15px', color: '#FFFFFF' }}>Leave group</span>
          </div>
          <div className="px-4 pb-4" style={{ borderTop: '1px solid #2A2A2A' }}>
            {!confirmLeave ? (
              <button onClick={() => setConfirmLeave(true)} className="w-full min-h-[44px] rounded-xl hover:opacity-80 mt-3"
                style={{ background: '#2A2A2A', color: '#FF4D4D', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(255,77,77,0.3)' }}>
                Leave this group
              </button>
            ) : (
              <div className="flex flex-col gap-3 mt-3">
                <p style={{ fontSize: '14px', color: '#A0A0A0', lineHeight: 1.6 }}>
                  Are you sure? This will remove your profile and check-in history. It cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button onClick={leaveGroup} disabled={leavingGroup} className="flex-1 min-h-[44px] rounded-xl text-white disabled:opacity-50 hover:opacity-80"
                    style={{ background: '#FF4D4D', fontWeight: 600, fontSize: '14px' }}>
                    {leavingGroup ? 'Leaving…' : 'Yes, leave group'}
                  </button>
                  <button onClick={() => setConfirmLeave(false)} className="min-h-[44px] px-5 rounded-xl hover:opacity-80"
                    style={{ background: '#2A2A2A', color: '#A0A0A0', fontSize: '14px', border: '1px solid #333333' }}>
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
