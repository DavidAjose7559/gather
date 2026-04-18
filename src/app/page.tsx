import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { CheckIn, Profile, SermonSchedule } from '@/lib/types'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

const AVATAR_COLORS = ['#FF4D4D', '#FF9500', '#4CAF50', '#6C63FF', '#00BCD4', '#E91E63']
function avatarColor(name: string): string {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65) - 65
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
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
  strong: 'Spiritually strong', okay: 'Doing okay', struggling: 'Struggling',
}

function InitialsCircle({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold uppercase text-white flex-shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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
    return (a.display_name ?? a.full_name).localeCompare(b.display_name ?? b.full_name)
  })

  const firstName = currentProfile.full_name.split(' ')[0]

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A0A' }}>
      <div className="max-w-md mx-auto px-4 pt-10 pb-8 flex flex-col gap-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>Gather</h1>
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#606060', marginTop: '3px', letterSpacing: '0.06em' }}>
              {formatDate(new Date())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {myStreak >= 2 && (
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: '#2A2A2A', border: '1px solid #333' }}
              >
                <span style={{ fontSize: '14px' }}>🔥</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF9500' }}>{myStreak}</span>
              </div>
            )}
            {currentProfile.role === 'admin' && (
              <Link
                href="/admin"
                style={{ fontSize: '13px', color: '#A0A0A0', fontWeight: 500 }}
                className="min-h-[44px] flex items-center hover:opacity-70"
              >
                Manage
              </Link>
            )}
          </div>
        </div>

        {/* Greeting */}
        <p style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF' }}>
          Good to see you, {firstName}.
        </p>

        {/* Support banners */}
        {visibleSupportRequests.slice(0, 2).map(({ checkIn, profile }) => (
          <div
            key={checkIn.id}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#2E1E00', border: '1px solid #4A3000', borderLeft: '3px solid #FF9500' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#FF9500' }}>
              {profile?.display_name ?? profile?.full_name ?? 'Someone'} asked for someone to reach out.
            </p>
            <Link
              href={`/checkin/${checkIn.id}`}
              style={{ fontSize: '13px', fontWeight: 600, color: '#FF9500', flexShrink: 0 }}
              className="min-h-[44px] flex items-center hover:opacity-70"
            >
              View →
            </Link>
          </div>
        ))}
        {visibleSupportRequests.length > 2 && (
          <div
            className="px-4 py-3 rounded-2xl"
            style={{ background: '#2E1E00', border: '1px solid #4A3000', borderLeft: '3px solid #FF9500' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#FF9500' }}>
              {visibleSupportRequests.length - 2} more {visibleSupportRequests.length - 2 === 1 ? 'person has' : 'people have'} asked for support today.
            </p>
          </div>
        )}

        {/* Check-in CTA or status */}
        {!myCheckIn ? (
          <Link href="/checkin">
            <div
              className="rounded-2xl p-6 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #9C88FF)' }}
            >
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '4px' }}>
                How are you doing today?
              </p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Check in now</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                Take a moment to reflect and let your people know how you&apos;re doing.
              </p>
              <div
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.2)', fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}
              >
                Start check-in →
              </div>
            </div>
          </Link>
        ) : (
          <div
            className="rounded-2xl px-4 py-4 flex items-center justify-between"
            style={{ background: '#1A2E1A', border: '1px solid #2D4A2D', borderLeft: '3px solid #4CAF50' }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#4CAF50">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#4CAF50' }}>
                  {myStreak >= 3 ? `${myStreak} days in a row` : myCheckIn.emotional_state ? emotionalLabels[myCheckIn.emotional_state] : 'Checked in'}
                </p>
              </div>
              <p style={{ fontSize: '13px', color: '#A0A0A0' }}>
                {myStreak >= 3 ? 'Keep the streak going' : 'Checked in today'}
              </p>
            </div>
            <Link
              href="/checkin"
              style={{ fontSize: '14px', fontWeight: 500, color: '#6C63FF' }}
              className="min-h-[44px] flex items-center hover:opacity-70"
            >
              Edit
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#4CAF50' }}>{checkedInCount}</span>
            <span style={{ fontSize: '13px', color: '#A0A0A0' }}>checked in</span>
          </div>
          <div className="flex-1 rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#606060' }}>{notYetCount}</span>
            <span style={{ fontSize: '13px', color: '#A0A0A0' }}>not yet</span>
          </div>
        </div>

        {/* Sermon card */}
        {todaySermon && (
          <Link href="/sermons">
            <div
              className="rounded-2xl flex items-center gap-4 p-4 hover:opacity-80 transition-opacity"
              style={{ background: '#1A1A1A', border: '1px solid #333333' }}
            >
              {todaySermon.episode_image_url ? (
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image src={todaySermon.episode_image_url} alt={todaySermon.episode_title} fill className="rounded-xl object-cover" sizes="48px" />
                </div>
              ) : (
                <div className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: '#2A2A2A' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Sermon of the Day</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }} className="truncate">{todaySermon.episode_title}</p>
                {todaySermon.theme && <p style={{ fontSize: '12px', color: '#A0A0A0' }} className="truncate">{todaySermon.theme}</p>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </Link>
        )}

        {/* Member list */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Your Group
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
            {sortedProfiles.map((profile, index) => {
              const checkIn = checkIns.find((c) => c.user_id === profile.id)
              const isCheckedIn = checkedInIds.has(profile.id)
              const isVisible = getVisibleCheckIn(checkIn, user.id, grants)
              const memberStreak = streakMap.get(profile.id) ?? 0
              const displayName = profile.display_name ?? profile.full_name

              return (
                <div
                  key={profile.id}
                  className="px-4 py-3 flex items-center gap-3"
                  style={index > 0 ? { borderTop: '1px solid #2A2A2A' } : {}}
                >
                  <InitialsCircle name={displayName} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate flex items-center gap-2" style={{ fontSize: '15px', fontWeight: 500, color: isCheckedIn ? '#FFFFFF' : '#606060' }}>
                      {displayName}
                      {profile.id === user.id && <span style={{ fontSize: '11px', color: '#606060', fontWeight: 400 }}>you</span>}
                      {memberStreak >= 2 && <span style={{ fontSize: '12px', color: '#FF9500', fontWeight: 500 }}>🔥 {memberStreak}</span>}
                    </p>
                    {isCheckedIn && (
                      <p className="truncate" style={{ fontSize: '13px', color: '#A0A0A0', marginTop: '1px' }}>
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
                    <span className="w-2 h-2 rounded-full" style={{ background: isCheckedIn ? '#4CAF50' : '#333333' }} />
                    {isCheckedIn && checkIn && isVisible && (
                      <Link href={`/checkin/${checkIn.id}`} style={{ fontSize: '13px', color: '#6C63FF', fontWeight: 500 }} className="min-h-[44px] flex items-center hover:opacity-70">
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
