import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [eventsRes, rsvpsRes] = await Promise.all([
    supabase.from('events').select('*').order('event_date'),
    supabase.from('event_rsvps').select('*'),
  ])

  const events = eventsRes.data ?? []
  const rsvps = rsvpsRes.data ?? []

  const eventsWithMeta = events.map((event) => {
    const eventRsvps = rsvps.filter((r) => r.event_id === event.id)
    return {
      ...event,
      rsvp_counts: {
        going: eventRsvps.filter((r) => r.status === 'going').length,
        maybe: eventRsvps.filter((r) => r.status === 'maybe').length,
        not_going: eventRsvps.filter((r) => r.status === 'not_going').length,
      },
      my_rsvp: (eventRsvps.find((r) => r.user_id === user.id)?.status ?? null) as
        | 'going' | 'maybe' | 'not_going' | null,
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
