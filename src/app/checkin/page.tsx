'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CheckIn } from '@/lib/types'

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
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`min-h-[48px] px-2 py-2.5 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
            value === opt.value
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
          }`}
        >
          {opt.emoji && <span className="text-base">{opt.emoji}</span>}
          <span className="leading-tight text-center">{opt.label}</span>
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

      const today = new Date().toISOString().split('T')[0]

      const [checkInRes, membersRes] = await Promise.all([
        supabase
          .from('check_ins')
          .select('*')
          .eq('user_id', user.id)
          .eq('check_in_date', today)
          .single(),
        supabase.from('profiles').select('*').neq('id', user.id).order('full_name'),
      ])

      setMembers(membersRes.data ?? [])

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
      const { data, error } = await supabase
        .from('check_ins')
        .insert(payload)
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

    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (existingCheckIn && !editing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Today's check-in</h1>
            <button
              onClick={() => { populateFormFromCheckIn(existingCheckIn); setEditing(true) }}
              className="min-h-[44px] px-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Edit
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-gray-500 text-sm">You already checked in today. Tap Edit to update it.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="min-h-[48px] bg-gray-100 text-gray-700 font-semibold rounded-xl px-4 py-3 hover:bg-gray-200 transition-all"
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editing ? 'Update your check-in' : 'How are you today?'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Be honest. This is a safe space.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Spiritual life */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Spiritual life</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Time in the Word</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Prayer life</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Emotionally</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Physically</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">A little more (optional)</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Anything you're struggling with?
              </label>
              <textarea
                value={struggles}
                onChange={(e) => setStruggles(e.target.value)}
                placeholder="Share as much or as little as you like…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Something you're grateful for?
              </label>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Big or small, it counts…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Anything else on your mind?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Whatever you want to share…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
              />
            </div>
          </div>

          {/* Support toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <label className="flex items-center justify-between gap-4 cursor-pointer min-h-[44px]">
              <div>
                <p className="font-semibold text-gray-900">I'd like someone to reach out</p>
                <p className="text-sm text-gray-500">Let your group know you could use support.</p>
              </div>
              <button
                type="button"
                onClick={() => setSupportRequested(!supportRequested)}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                  supportRequested ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    supportRequested ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Who can see this?</h2>
            <div className="flex flex-col gap-2">
              {([
                { value: 'everyone', label: 'Everyone in the group', emoji: '👥' },
                { value: 'specific', label: 'Specific people', emoji: '👤' },
                { value: 'one_person', label: 'Just one person', emoji: '🤫' },
              ] as { value: VisibilityType; label: string; emoji: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${
                    visibility === opt.value
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-200'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {(visibility === 'specific' || visibility === 'one_person') && (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-sm text-gray-500">
                  {visibility === 'one_person' ? 'Choose one person' : 'Choose people'}:
                </p>
                {members.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 min-h-[44px] cursor-pointer"
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
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-900">
                      {m.display_name ?? m.full_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex flex-col gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[52px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl px-4 py-3 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base"
            >
              {saving ? 'Saving…' : editing ? 'Update check-in' : 'Submit check-in'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full min-h-[48px] bg-gray-100 text-gray-600 font-medium rounded-xl px-4 py-3 hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
