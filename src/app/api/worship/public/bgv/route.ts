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
    .select('id, title, event_date, venue')
    .eq('bgv_share_token', token)
    .single()

  if (eventErr || !event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: ministers, error: minErr } = await supabaseAdmin
    .from('worship_bgv_ministers')
    .select('id, name, position')
    .eq('event_id', event.id)
    .order('position')

  if (minErr) {
    return NextResponse.json({ error: minErr.message }, { status: 500 })
  }

  const ministerIds = (ministers ?? []).map((m) => m.id)
  let singersMap: Record<string, { id: string; name: string; voice_part: string }[]> = {}

  if (ministerIds.length > 0) {
    const { data: singers, error: singErr } = await supabaseAdmin
      .from('worship_bgv_singers')
      .select('id, minister_id, name, voice_part')
      .in('minister_id', ministerIds)

    if (singErr) {
      return NextResponse.json({ error: singErr.message }, { status: 500 })
    }

    for (const s of singers ?? []) {
      if (!singersMap[s.minister_id]) singersMap[s.minister_id] = []
      singersMap[s.minister_id].push({ id: s.id, name: s.name, voice_part: s.voice_part })
    }
  }

  const ministersWithSingers = (ministers ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    position: m.position,
    singers: singersMap[m.id] ?? [],
  }))

  return NextResponse.json({
    title: event.title,
    event_date: event.event_date,
    venue: event.venue,
    ministers: ministersWithSingers,
  })
}
