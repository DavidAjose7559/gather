import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profileRes, eventsRes, rsvpsRes, profilesRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('events').select('*').order('event_date'),
    supabase.from('event_rsvps').select('id, event_id, user_id, status, ride_status, area, can_take'),
    supabase.from('profiles').select('id, full_name, display_name'),
  ])

  const isAdmin = profileRes.data?.role === 'admin'
  const events = eventsRes.data ?? []
  const rsvps = rsvpsRes.data ?? []
  const profiles = profilesRes.data ?? []
  const profileMap = new Map(profiles.map(p => [p.id, p]))

  const myRsvpIds = rsvps.filter(r => r.user_id === user.id).map(r => r.id)

  let myMatchesAsDriver: { id: string; event_id: string; driver_rsvp_id: string; status: string }[] = []
  let myMemberships: { id: string; match_id: string; rsvp_id: string; status: string }[] = []
  let riderMatchDetails: { id: string; event_id: string; status: string }[] = []

  if (myRsvpIds.length > 0) {
    const [driverRes, riderRes] = await Promise.all([
      supabase.from('ride_matches').select('id, event_id, driver_rsvp_id, status').in('driver_rsvp_id', myRsvpIds),
      supabase.from('ride_match_members').select('id, match_id, rsvp_id, status').in('rsvp_id', myRsvpIds),
    ])
    myMatchesAsDriver = driverRes.data ?? []
    myMemberships = riderRes.data ?? []

    if (myMemberships.length > 0) {
      const matchIds = myMemberships.map(m => m.match_id)
      const { data } = await supabase.from('ride_matches').select('id, event_id, status').in('id', matchIds)
      riderMatchDetails = data ?? []
    }
  }

  const eventsWithMeta = events.map((event) => {
    const eventRsvps = rsvps.filter(r => r.event_id === event.id)
    const myRsvp = eventRsvps.find(r => r.user_id === user.id)

    const rideSummary = { driving: 0, need_ride: 0, own_way: 0, unsure: 0 }
    for (const r of eventRsvps) {
      if (r.status === 'going' && r.ride_status) {
        (rideSummary as Record<string, number>)[r.ride_status]++
      }
    }

    let myMatch: { id: string; status: 'pending' | 'accepted' | 'declined'; role: 'driver' | 'rider' } | null = null
    if (myRsvp) {
      const asDriver = myMatchesAsDriver.find(m => m.event_id === event.id)
      if (asDriver) {
        myMatch = { id: asDriver.id, status: asDriver.status as 'pending' | 'accepted' | 'declined', role: 'driver' }
      } else {
        const membership = myMemberships.find(m => m.rsvp_id === myRsvp.id)
        if (membership) {
          const parentMatch = riderMatchDetails.find(m => m.id === membership.match_id && m.event_id === event.id)
          if (parentMatch) {
            myMatch = { id: parentMatch.id, status: membership.status as 'pending' | 'accepted' | 'declined', role: 'rider' }
          }
        }
      }
    }

    const showAttendance = isAdmin || event.show_attendance
    const attendance = showAttendance
      ? eventRsvps
          .filter(r => r.status === 'going')
          .map(r => {
            const p = profileMap.get(r.user_id)
            return {
              user_id: r.user_id,
              rsvp_id: r.id,
              name: p?.display_name ?? p?.full_name ?? 'Unknown',
              area: r.area ?? null,
              ride_status: r.ride_status ?? null,
            }
          })
      : null

    return {
      ...event,
      rsvp_counts: {
        going: eventRsvps.filter(r => r.status === 'going').length,
        maybe: eventRsvps.filter(r => r.status === 'maybe').length,
        not_going: eventRsvps.filter(r => r.status === 'not_going').length,
      },
      ride_summary: rideSummary,
      my_rsvp: (myRsvp?.status ?? null) as 'going' | 'maybe' | 'not_going' | null,
      my_ride_status: (myRsvp?.ride_status ?? null) as 'driving' | 'need_ride' | 'own_way' | 'unsure' | null,
      my_area: myRsvp?.area ?? null,
      my_can_take: myRsvp?.can_take ?? null,
      my_match: myMatch,
      attendance,
    }
  })

  return NextResponse.json({ events: eventsWithMeta })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { title, event_date, event_time, location, description } = body

  if (!title?.trim() || !event_date) {
    return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      event_date,
      event_time: event_time?.trim() || null,
      location: location?.trim() || null,
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, show_attendance } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('events')
    .update({ show_attendance })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
