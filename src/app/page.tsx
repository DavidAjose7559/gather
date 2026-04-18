import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { CheckIn, Profile, SermonSchedule } from '@/lib/types'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

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

  // Sort members: checked-in first (alphabetical), then not-yet (alphabetical)
  const sortedProfiles = [...profiles].sort((a, b) => {
    const aIn = checkedInIds.has(a.id)
    const bIn = checkedInIds.has(b.id)
    if (aIn !== bIn) return aIn ? -1 : 1
    const aName = (a.display_name ?? a.full_name).toLowerCase()
    const bName = (b.display_name ?? b.full_name).toLowerCase()
    return aName.localeCompare(bName)
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', paddingBottom: 96 }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '0 16px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Gather</h1>
          {currentProfile.role === 'admin' && (
            <Link
              href="/admin"
              style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', minHeight: 44, display: 'flex', alignItems: 'center' }}
            >
              Manage
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8, paddingBottom: 16 }}>
          {/* Date + greeting */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {formatDate(new Date())}
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white' }}>
              Good to see you, {currentProfile.full_name.split(' ')[0]}.
            </h2>
          </div>

          {/* Support banners */}
          {visibleSupportRequests.slice(0, 2).map(({ checkIn, profile }) => (
            <div
              key={checkIn.id}
              style={{ backgroundColor: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 20, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🙏</span>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#FF9500' }}>
                  {profile?.display_name ?? profile?.full_name ?? 'Someone'} asked for someone to reach out today.
                </p>
              </div>
              <Link
                href={`/checkin/${checkIn.id}`}
                style={{ fontSize: 12, fontWeight: 700, color: '#FF9500', flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                View →
              </Link>
            </div>
          ))}
          {visibleSupportRequests.length > 2 && (
            <div style={{ backgroundColor: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 20, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🙏</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#FF9500' }}>
                {visibleSupportRequests.length - 2} more {visibleSupportRequests.length - 2 === 1 ? 'person has' : 'people have'} asked for support today.
              </p>
            </div>
          )}

          {/* Check-in CTA or status */}
          {!myCheckIn ? (
            <Link href="/checkin" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg, #6C63FF, #A855F7)', borderRadius: 24, padding: 24, cursor: 'pointer' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>How are you doing today?</p>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 12 }}>Check in now</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5 }}>
                  Take a moment to reflect and let your people know how you&apos;re doing.
                </p>
                <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, color: 'white' }}>
                  Start check-in →
                </div>
              </div>
            </Link>
          ) : (
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <p style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>You&apos;ve checked in</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
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
                style={{ fontSize: 14, fontWeight: 500, color: '#6C63FF', minHeight: 44, display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Edit
              </Link>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 36, fontWeight: 700, color: '#6C63FF' }}>{checkedInCount}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>checked in</p>
            </div>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{notYetCount}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>not yet</p>
            </div>
          </div>

          {/* Sermon of the Day */}
          {todaySermon && (
            <Link href="/sermons" style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                {todaySermon.episode_image_url ? (
                  <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                    <Image
                      src={todaySermon.episode_image_url}
                      alt={todaySermon.episode_title}
                      fill
                      className="rounded-xl object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : (
                  <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, backgroundColor: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    🎙️
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Sermon of the Day
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todaySermon.episode_title}</p>
                  {todaySermon.theme && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todaySermon.theme}</p>
                  )}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>›</span>
              </div>
            </Link>
          )}

          {/* Member list */}
          <div>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              Your group
              {visibleSupportRequests.length > 0 && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF9500', display: 'inline-block' }} />
              )}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedProfiles.map((profile) => {
                const checkIn = checkIns.find((c) => c.user_id === profile.id)
                const isCheckedIn = checkedInIds.has(profile.id)
                const isVisible = getVisibleCheckIn(checkIn, user.id, grants)
                const memberStreak = streakMap.get(profile.id) ?? 0
                const name = profile.display_name ?? profile.full_name
                const avatarColor = getAvatarColor(profile.full_name)
                const initials = profile.full_name.trim().split(' ').length >= 2
                  ? `${profile.full_name.trim().split(' ')[0][0]}${profile.full_name.trim().split(' ').at(-1)![0]}`
                  : profile.full_name.slice(0, 2)

                return (
                  <div
                    key={profile.id}
                    style={{
                      backgroundColor: '#1A1A1A',
                      borderRadius: 16,
                      border: '1px solid #2A2A2A',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      opacity: isCheckedIn ? 1 : 0.5,
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0, textTransform: 'uppercase' }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, color: 'white', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                        {profile.id === user.id && (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>you</span>
                        )}
                        {memberStreak >= 2 && (
                          <span style={{ fontSize: 12, color: '#FF9500', fontWeight: 700 }}>🔥 {memberStreak}</span>
                        )}
                      </p>
                      {isCheckedIn && (
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
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
                        style={{ fontSize: 13, color: '#6C63FF', fontWeight: 500, minHeight: 44, display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}
                      >
                        View
                      </Link>
                    )}
                    {isCheckedIn && checkIn && !isVisible && (
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>🔒</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
