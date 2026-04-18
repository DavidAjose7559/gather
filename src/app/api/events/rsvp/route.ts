import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id, status } = await request.json()
  if (!event_id) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  if (status === null || status === undefined) {
    // Remove RSVP
    await supabase.from('event_rsvps').delete()
      .eq('event_id', event_id).eq('user_id', user.id)
    return NextResponse.json({ my_rsvp: null })
  }

  if (!['going', 'maybe', 'not_going'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Check if user already has this status (toggle off)
  const { data: existing } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .single()

  if (existing?.status === status) {
    // Toggle off — remove
    await supabase.from('event_rsvps').delete()
      .eq('event_id', event_id).eq('user_id', user.id)
    return NextResponse.json({ my_rsvp: null })
  }

  // Upsert with new status
  const { error } = await supabase.from('event_rsvps').upsert(
    { event_id, user_id: user.id, status },
    { onConflict: 'event_id,user_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ my_rsvp: status })
}
