import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { CheckIn, Profile, SermonSchedule } from '@/lib/types'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getVisibleCheckIn(
  checkIn: CheckIn | undefined,
  currentUserId: string,
  grants: { check_in_id: string; granted_to: string }[]
): boolean {
  if (!checkIn) return false
  if (checkIn.user_id === currentUserId) return true
  if (checkIn.visibility_type === 'everyone') return true
  if (checkIn.visibility_type === 'specific' || checkIn.visibility_type === 'one_person') {
    return grants.some((g) => g.check_in_id === checkIn.id && g.granted_to === currentUserId)
  }
  return false
}

const emotionalLabels: Record<string, string> = {
  peaceful: 'Peaceful', okay: 'Okay', anxious: 'Anxious',
  overwhelmed: 'Overwhelmed', low: 'Feeling low', joyful: 'Joyful',
}
const spiritualLabels: Record<string, string> = {
  strong: 'Spiritually strong', okay: 'Doing okay', struggling: 'Struggling a bit',
}

function InitialsCircle({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 uppercase text-white"
      style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)' }}
    >
      {initials}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!currentProfile) redirect('/onboarding')

  const today = todayToronto()
  const ninetyDaysAgoCursor = new Date()
  ninetyDaysAgoCursor.setDate(ninetyDaysAgoCursor.getDate() - 90)
  const ninetyDaysAgoStr = formatDateToronto(ninetyDaysAgoCursor)

  const [profilesRes, checkInsRes, grantsRes, recentCheckInsRes, sermonRes] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('check_ins').select('*').eq('check_in_date', today),
    supabase.from('visibility_grants').select('check_in_id, granted_to'),
    supabase.from('check_ins').select('user_id, check_in_date').gte('check_in_date', ninetyDaysAgoStr).order('check_in_date', { ascending: false }),
    supabase.from('sermon_schedule').select('*').eq('schedule_date', today).maybeSingle(),
  ])

  const profiles: Profile[] = profilesRes.data ?? []
  const checkIns: CheckIn[] = checkInsRes.data ?? []
  const grants = grantsRes.data ?? []
  const recentCheckIns = recentCheckInsRes.data ?? []
  const todaySermon: SermonSchedule | null = sermonRes.data ?? null

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

  const visibleSupportRequests = checkIns
    .filter((c) => c.support_requested && c.user_id !== user.id)
    .filter((c) => getVisibleCheckIn(c, user.id, grants))
    .map((c) => ({ checkIn: c, profile: profiles.find((p) => p.id === c.user_id) }))

  const sortedProfiles = [...profiles].sort((a, b) => {
    const aIn = checkedInIds.has(a.id)
    const bIn = checkedInIds.has(b.id)
    if (aIn !== bIn) return aIn ? -1 : 1
    const aName = (a.display_name ?? a.full_name).toLowerCase()
    const bName = (b.display_name ?? b.full_name).toLowerCase()
    return aName.localeCompare(bName)
  })

  const firstName = currentProfile.full_name.split(' ')[0]

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FAF9F7' }}>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p style={{ fontSize: '13px', color: '#A8A29E', fontWeight: 400 }}>
              {formatDate(new Date())}
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1A1714', marginTop: '2px' }}>
              Good to see you, {firstName}.
            </h1>
          </div>
          {currentProfile.role === 'admin' && (
            <Link
              href="/admin"
              style={{ fontSize: '13px', color: '#6B6560', fontWeight: 500 }}
              className="flex-shrink-0 min-h-[44px] flex items-center hover:opacity-70 transition-opacity"
            >
              Manage
            </Link>
          )}
        </div>

        {/* Support banners — capped at 2 */}
        {visibleSupportRequests.slice(0, 2).map(({ checkIn, profile }) => (
          <div
            key={checkIn.id}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl"
            style={{ borderLeft: '3px solid #F59E0B', background: '#FEF3C7', border: '1px solid #FDE68A', borderLeftWidth: '3px', borderLeftColor: '#F59E0B' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#92400E' }}>
              {profile?.display_name ?? profile?.full_name ?? 'Someone'} asked for someone to reach out today.
            </p>
            <Link
              href={`/checkin/${checkIn.id}`}
              style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', flexShrink: 0 }}
              className="min-h-[44px] flex items-center hover:opacity-70"
            >
              View →
            </Link>
          </div>
        ))}
        {visibleSupportRequests.length > 2 && (
          <div
            className="px-4 py-3 rounded-2xl"
            style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderLeftWidth: '3px', borderLeftColor: '#F59E0B' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#92400E' }}>
              {visibleSupportRequests.length - 2} more {visibleSupportRequests.length - 2 === 1 ? 'person has' : 'people have'} asked for support today.
            </p>
          </div>
        )}

        {/* Check-in CTA or status */}
        {!myCheckIn ? (
          <Link href="/checkin">
            <div
              className="rounded-2xl p-6 text-white cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)' }}
            >
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: '4px' }}>
                How are you doing today?
              </p>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Check in now</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                Take a moment to reflect and let your people know how you&apos;re doing.
              </p>
              <div
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.2)', fontSize: '14px', fontWeight: 500 }}
              >
                Start check-in →
              </div>
            </div>
          </Link>
        ) : (
          <div
            className="rounded-2xl px-4 py-4 flex items-center justify-between"
            style={{ background: '#FFFFFF', border: '1px solid #E8E4DE', borderLeft: '3px solid #22C55E' }}
          >
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#1A1714' }}>
                {myStreak >= 3
                  ? `${myStreak} days in a row`
                  : myCheckIn.emotional_state
                  ? emotionalLabels[myCheckIn.emotional_state]
                  : 'Checked in'}
              </p>
              <p style={{ fontSize: '13px', color: '#6B6560', marginTop: '2px' }}>
                {myStreak >= 3 ? 'Keep the streak going' : 'Checked in today'}
              </p>
            </div>
            <Link
              href="/checkin"
              style={{ fontSize: '14px', fontWeight: 500, color: '#5B4FCF' }}
              className="min-h-[44px] flex items-center hover:opacity-70"
            >
              Edit
            </Link>
          </div>
        )}

        {/* Stats inline */}
        <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#6B6560' }}>
          <span style={{ fontWeight: 600, color: '#5B4FCF' }}>{checkedInCount}</span>
          <span>checked in</span>
          <span style={{ color: '#A8A29E' }}>·</span>
          <span style={{ fontWeight: 600, color: '#A8A29E' }}>{notYetCount}</span>
          <span>not yet</span>
        </div>

        {/* Sermon of the Day card */}
        {todaySermon && (
          <Link href="/sermons">
            <div
              className="rounded-2xl flex items-center gap-3 p-4 transition-opacity hover:opacity-80"
              style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}
            >
              {todaySermon.episode_image_url ? (
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={todaySermon.episode_image_url}
                    alt={todaySermon.episode_title}
                    fill
                    className="rounded-xl object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div
                  className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: '#EEF0FB', fontSize: '20px' }}
                >
                  🎙️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#5B4FCF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                  Sermon of the Day
                </p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1714' }} className="truncate">
                  {todaySermon.episode_title}
                </p>
                {todaySermon.theme && (
                  <p style={{ fontSize: '12px', color: '#A8A29E' }} className="truncate">{todaySermon.theme}</p>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        )}

        {/* Member list */}
        <div>
          <p
            className="mb-3 flex items-center gap-2"
            style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A8A29E' }}
          >
            Your group
            {visibleSupportRequests.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#F59E0B' }} />
            )}
          </p>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
            {sortedProfiles.map((profile, index) => {
              const checkIn = checkIns.find((c) => c.user_id === profile.id)
              const isCheckedIn = checkedInIds.has(profile.id)
              const isVisible = getVisibleCheckIn(checkIn, user.id, grants)
              const memberStreak = streakMap.get(profile.id) ?? 0

              return (
                <div
                  key={profile.id}
                  className="px-4 py-3 flex items-center gap-3"
                  style={index > 0 ? { borderTop: '1px solid #EBEBEB' } : {}}
                >
                  <InitialsCircle name={profile.display_name ?? profile.full_name} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate flex items-center gap-1.5" style={{ fontSize: '15px', fontWeight: 500, color: '#1A1714' }}>
                      {profile.display_name ?? profile.full_name}
                      {profile.id === user.id && (
                        <span style={{ fontSize: '12px', color: '#A8A29E', fontWeight: 400 }}>you</span>
                      )}
                      {memberStreak >= 2 && (
                        <span style={{ fontSize: '12px', color: '#FB923C', fontWeight: 500 }}>🔥 {memberStreak}</span>
                      )}
                    </p>
                    {isCheckedIn && (
                      <p className="truncate" style={{ fontSize: '13px', color: '#6B6560', marginTop: '1px' }}>
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: isCheckedIn ? '#22C55E' : '#D4D0CB' }}
                    />
                    {isCheckedIn && checkIn && isVisible && (
                      <Link
                        href={`/checkin/${checkIn.id}`}
                        style={{ fontSize: '13px', color: '#5B4FCF', fontWeight: 500 }}
                        className="min-h-[44px] flex items-center hover:opacity-70"
                      >
                        View
                      </Link>
                    )}
                    {isCheckedIn && checkIn && !isVisible && <LockIcon />}
                  </div>
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
