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

function Chip({ label, color = 'gray' }: { label: string; color?: 'indigo' | 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
      color === 'indigo' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {label}
    </span>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  const initials = fullName.trim().split(' ').length >= 2
    ? `${fullName.trim().split(' ')[0][0]}${fullName.trim().split(' ').at(-1)![0]}`
    : fullName.slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>

        {/* Avatar + personal info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold uppercase flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{displayName || fullName}</p>
              <p className="text-sm text-gray-400">{email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Display name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nickname your group sees"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
            />
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2">
            <p className="text-sm text-gray-500 flex-1 truncate">{email}</p>
            <p className="text-xs text-gray-400 flex-shrink-0">Contact admin to change</p>
          </div>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Saved!</p>
          )}

          <button
            onClick={saveProfile}
            disabled={saving || !fullName.trim()}
            className="w-full min-h-[48px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl px-4 py-3 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Check-in history */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Your check-ins</h2>
            {streak > 0 ? (
              <span className="text-sm font-semibold text-orange-500">🔥 {streak} day streak</span>
            ) : (
              <span className="text-xs text-gray-400">Check in today to start your streak</span>
            )}
          </div>

          {checkIns.length === 0 ? (
            <p className="text-sm text-gray-400">No check-ins in the last 30 days.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {checkIns.map((c) => (
                <Link
                  key={c.id}
                  href={`/checkin/${c.id}`}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(c.check_in_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                      {c.check_in_date === today && (
                        <span className="ml-1.5 text-xs text-indigo-600 font-semibold">today</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.emotional_state && (
                      <Chip label={emotionalLabels[c.emotional_state]} color="indigo" />
                    )}
                    {c.spiritual_life && (
                      <Chip label={spiritualLabels[c.spiritual_life]} />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900">Settings</h2>

          <label className="flex items-center justify-between gap-4 cursor-pointer min-h-[44px]">
            <div>
              <p className="text-sm font-medium text-gray-900">Daily reminder emails</p>
              <p className="text-xs text-gray-400">Get a gentle nudge if you haven&apos;t checked in</p>
            </div>
            <button
              type="button"
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${reminderEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${reminderEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </label>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Default visibility</p>
            <div className="flex flex-col gap-2">
              {([
                { value: 'everyone', label: 'Everyone in the group', emoji: '👥' },
                { value: 'specific', label: 'Specific people', emoji: '👤' },
                { value: 'one_person', label: 'Just one person', emoji: '🤫' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDefaultVisibility(opt.value)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${
                    defaultVisibility === opt.value
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-200'
                  }`}
                >
                  <span>{opt.emoji}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving || !fullName.trim()}
            className="w-full min-h-[44px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl px-4 py-2.5 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all text-sm"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Leave group</h2>
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-all text-left"
            >
              Leave this group
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure? This will remove your profile and check-in history. It cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={leaveGroup}
                  disabled={leavingGroup}
                  className="flex-1 min-h-[44px] bg-red-500 text-white font-semibold rounded-xl text-sm hover:bg-red-600 disabled:opacity-50 transition-all"
                >
                  {leavingGroup ? 'Leaving…' : 'Yes, leave group'}
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="min-h-[44px] px-4 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-all"
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
