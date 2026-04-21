import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id, status, ride_status, area, can_take } = await request.json()
  if (!event_id) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  if (status === null || status === undefined) {
    await supabase.from('event_rsvps').delete()
      .eq('event_id', event_id).eq('user_id', user.id)
    return NextResponse.json({ my_rsvp: null })
  }

  if (!['going', 'maybe', 'not_going'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const upsertData: Record<string, unknown> = {
    event_id,
    user_id: user.id,
    status,
    ride_status: ride_status ?? null,
    area: area ?? null,
    can_take: can_take ?? null,
  }

  // Clear ride fields for non-going statuses
  if (status !== 'going') {
    upsertData.ride_status = null
    upsertData.area = null
    upsertData.can_take = null
  }

  const { error } = await supabase.from('event_rsvps').upsert(upsertData, { onConflict: 'event_id,user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ my_rsvp: status, my_ride_status: upsertData.ride_status, my_area: upsertData.area })
}
