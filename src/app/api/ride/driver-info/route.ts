import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('match_id')
  if (!matchId) return NextResponse.json({ error: 'Missing match_id' }, { status: 400 })

  const { data: match } = await supabase
    .from('ride_matches')
    .select('id, event_id, driver_rsvp_id, status')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: members } = await supabase
    .from('ride_match_members')
    .select('rsvp_id')
    .eq('match_id', matchId)

  const riderRsvpIds = (members ?? []).map(m => m.rsvp_id)
  const allRsvpIds = [match.driver_rsvp_id, ...riderRsvpIds]

  const { data: rsvpData } = await supabase
    .from('event_rsvps')
    .select('id, user_id, area')
    .in('id', allRsvpIds)

  const userIds = [...new Set((rsvpData ?? []).map(r => r.user_id))]

  const [profilesRes, eventRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, display_name').in('id', userIds),
    supabase.from('events').select('title, event_date').eq('id', match.event_id).single(),
  ])

  const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]))
  const rsvpMap = new Map((rsvpData ?? []).map(r => [r.id, r]))

  const driverRsvp = rsvpMap.get(match.driver_rsvp_id)
  const driverProfile = driverRsvp ? profileMap.get(driverRsvp.user_id) : null
  const driverName = driverProfile?.display_name ?? driverProfile?.full_name ?? 'Unknown'

  const riders = riderRsvpIds.map(id => {
    const rsvp = rsvpMap.get(id)
    const p = rsvp ? profileMap.get(rsvp.user_id) : null
    return { name: p?.display_name ?? p?.full_name ?? 'Unknown', area: rsvp?.area ?? null }
  })

  return NextResponse.json({
    id: match.id,
    status: match.status,
    event_title: eventRes.data?.title ?? 'Event',
    event_date: eventRes.data?.event_date ?? '',
    driver_name: driverName,
    driver_area: driverRsvp?.area ?? null,
    riders,
  })
}
