import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const { data: event, error: eventErr } = await supabaseAdmin
    .from('worship_events')
    .select('id, title, event_date, venue, theme')
    .eq('share_token', token)
    .single()

  if (eventErr || !event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: orderItems, error: orderErr } = await supabaseAdmin
    .from('worship_order_of_service')
    .select('position, item, duration_minutes, assigned_to, notes')
    .eq('event_id', event.id)
    .order('position')

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 500 })
  }

  return NextResponse.json({
    title: event.title,
    event_date: event.event_date,
    venue: event.venue,
    theme: event.theme,
    order_of_service: orderItems ?? [],
  })
}
