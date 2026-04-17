import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { CheckIn, Profile, SermonSchedule } from '@/lib/types'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getVisibleCheckIn(
  checkIn: CheckIn | undefined,
  currentUserId: string,
  grants: { check_in_id: string; granted_to: string }[]
): boolean {
  if (!checkIn) return false
  if (checkIn.user_id === currentUserId) return true
  if (checkIn.visibility_type === 'everyone') return true
  if (
    checkIn.visibility_type === 'specific' ||
    checkIn.visibility_type === 'one_person'
  ) {
    return grants.some(
      (g) => g.check_in_id === checkIn.id && g.granted_to === currentUserId
    )
  }
  return false
}

const emotionalLabels: Record<string, string> = {
  peaceful: 'Peaceful',
  okay: 'Okay',
  anxious: 'Anxious',
  overwhelmed: 'Overwhelmed',
  low: 'Feeling low',
  joyful: 'Joyful',
}

const spiritualLabels: Record<string, string> = {
  strong: 'Spiritually strong',
  okay: 'Doing okay',
  struggling: 'Struggling a bit',
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check profile exists
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentProfile) redirect('/onboarding')

  const today = todayToronto()
  const ninetyDaysAgoCursor = new Date()
  ninetyDaysAgoCursor.setDate(ninetyDaysAgoCursor.getDate() - 90)
  const ninetyDaysAgoStr = formatDateToronto(ninetyDaysAgoCursor)

  // Load all profiles, today's check-ins, visibility grants, recent history, and today's sermon in parallel
  const [profilesRes, checkInsRes, grantsRes, recentCheckInsRes, sermonRes] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('check_ins').select('*').eq('check_in_date', today),
    supabase.from('visibility_grants').select('check_in_id, granted_to'),
    supabase
      .from('check_ins')
      .select('user_id, check_in_date')
      .gte('check_in_date', ninetyDaysAgoStr)
      .order('check_in_date', { ascending: false }),
    supabase.from('sermon_schedule').select('*').eq('schedule_date', today).maybeSingle(),
  ])

  const profiles: Profile[] = profilesRes.data ?? []
  const checkIns: CheckIn[] = checkInsRes.data ?? []
  const grants = grantsRes.data ?? []
  const recentCheckIns = recentCheckInsRes.data ?? []
  const todaySermon: SermonSchedule | null = sermonRes.data ?? null

  // Build streak map: userId → streak count
  const streakMap = new Map<string, number>()
  for (const profile of profiles) {
    const history = recentCheckIns.filter((c) => c.user_id === profile.id)
    streakMap.set(profile.id, calculateStreak(history))
  }
  const myStreak = streakMap.get(user.id) ?? 0

  const myCheckIn = checkIns.find((c) => c.user_id === user.id)
  const checkedInIds = new Set(checkIns.map((c) => c.user_id))
  const checkedInCount = checkedInIds.size
  const notYetCount = profiles.length - checkedInCount

  // Support banners: only check-ins from others that are visible to the current user
  const visibleSupportRequests = checkIns
    .filter((c) => c.support_requested && c.user_id !== user.id)
    .filter((c) => getVisibleCheckIn(c, user.id, grants))
    .map((c) => {
      const profile = profiles.find((p) => p.id === c.user_id)
      return { checkIn: c, profile }
    })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
              {formatDate(new Date())}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Good to see you, {currentProfile.full_name.split(' ')[0]}.
            </h1>
          </div>
          {currentProfile.role === 'admin' && (
            <Link
              href="/admin"
              className="flex-shrink-0 text-xs font-medium text-gray-400 hover:text-indigo-600 min-h-[44px] flex items-center transition-colors"
            >
              Manage members
            </Link>
          )}
        </div>

        {/* Support banners — one per visible support request */}
        {visibleSupportRequests.map(({ checkIn, profile }) => (
          <div
            key={checkIn.id}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-lg flex-shrink-0">🙏</span>
              <p className="text-sm font-medium text-amber-800">
                {profile?.display_name ?? profile?.full_name ?? 'Someone'} asked for someone to reach out today.
              </p>
            </div>
            <Link
              href={`/checkin/${checkIn.id}`}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex-shrink-0 min-h-[44px] flex items-center"
            >
              View →
            </Link>
          </div>
        ))}

        {/* Check-in CTA or status */}
        {!myCheckIn ? (
          <Link href="/checkin">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all">
              <p className="text-indigo-200 text-sm font-medium mb-1">How are you doing today?</p>
              <h2 className="text-xl font-bold mb-3">Check in now</h2>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Take a moment to reflect and let your people know how you're doing.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">
                Start check-in →
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-gray-900">You've checked in</p>
                <p className="text-sm text-gray-500">
                  {myStreak >= 3
                    ? `${myStreak} days in a row 🔥`
                    : myCheckIn.emotional_state
                    ? emotionalLabels[myCheckIn.emotional_state]
                    : 'Checked in today'}
                </p>
              </div>
            </div>
            <Link
              href="/checkin"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 min-h-[44px] flex items-center"
            >
              Edit
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-indigo-600">{checkedInCount}</p>
            <p className="text-sm text-gray-500 mt-1">checked in</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-400">{notYetCount}</p>
            <p className="text-sm text-gray-500 mt-1">not yet</p>
          </div>
        </div>

        {/* Sermon of the Day card */}
        {todaySermon && (
          <Link href="/sermons">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-3 p-4 hover:border-indigo-200 transition-colors">
              {todaySermon.episode_image_url ? (
                <div className="relative w-14 h-14 flex-shrink-0">
                  <Image
                    src={todaySermon.episode_image_url}
                    alt={todaySermon.episode_title}
                    fill
                    className="rounded-xl object-cover"
                    sizes="56px"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl">
                  🎙️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">
                  Sermon of the Day
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">{todaySermon.episode_title}</p>
                {todaySermon.theme && (
                  <p className="text-xs text-gray-400 truncate">{todaySermon.theme}</p>
                )}
              </div>
              <span className="text-gray-300 flex-shrink-0 self-center text-sm">›</span>
            </div>
          </Link>
        )}

        {/* Member list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            Your group
            {visibleSupportRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            )}
          </h2>
          <div className="flex flex-col gap-2">
            {profiles.map((profile) => {
              const checkIn = checkIns.find((c) => c.user_id === profile.id)
              const isCheckedIn = checkedInIds.has(profile.id)
              const isVisible = getVisibleCheckIn(checkIn, user.id, grants)

              const memberStreak = streakMap.get(profile.id) ?? 0

              return (
                <div
                  key={profile.id}
                  className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 shadow-sm"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                      {profile.display_name ?? profile.full_name}
                      {profile.id === user.id && (
                        <span className="text-xs text-gray-400 font-normal">you</span>
                      )}
                      {memberStreak >= 2 && (
                        <span className="text-xs text-orange-500 font-semibold">🔥 {memberStreak}</span>
                      )}
                    </p>
                    {isCheckedIn && (
                      <p className="text-sm text-gray-500 truncate">
                        {isVisible && checkIn
                          ? checkIn.emotional_state
                            ? emotionalLabels[checkIn.emotional_state]
                            : checkIn.spiritual_life
                            ? spiritualLabels[checkIn.spiritual_life]
                            : 'Checked in'
                          : 'Details private'}
                      </p>
                    )}
                  </div>
                  {isCheckedIn && checkIn && isVisible && (
                    <Link
                      href={`/checkin/${checkIn.id}`}
                      className="text-xs text-indigo-600 font-medium min-h-[44px] flex items-center hover:text-indigo-700 flex-shrink-0"
                    >
                      View
                    </Link>
                  )}
                  {isCheckedIn && checkIn && !isVisible && (
                    <span className="text-xs text-gray-400 flex-shrink-0">🔒</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
