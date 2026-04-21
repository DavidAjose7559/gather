import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('match_id')
  const rsvpId = request.nextUrl.searchParams.get('rsvp_id')
  if (!matchId || !rsvpId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const [matchRes, memberRes] = await Promise.all([
    supabase.from('ride_matches').select('id, event_id, driver_rsvp_id, status').eq('id', matchId).single(),
    supabase.from('ride_match_members').select('status').eq('match_id', matchId).eq('rsvp_id', rsvpId).single(),
  ])

  if (!matchRes.data || !memberRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const match = matchRes.data
  const { data: driverRsvp } = await supabase.from('event_rsvps').select('user_id, area').eq('id', match.driver_rsvp_id).single()
  const { data: driverProfile } = driverRsvp
    ? await supabase.from('profiles').select('full_name, display_name').eq('id', driverRsvp.user_id).single()
    : { data: null }
  const { data: eventData } = await supabase.from('events').select('title, event_date').eq('id', match.event_id).single()

  const driverName = driverProfile?.display_name ?? driverProfile?.full_name ?? 'Unknown'

  return NextResponse.json({
    id: match.id,
    member_status: memberRes.data.status,
    event_title: eventData?.title ?? 'Event',
    event_date: eventData?.event_date ?? '',
    driver_name: driverName,
    driver_area: driverRsvp?.area ?? null,
  })
}
