import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyWorshipAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role, is_worship_team').eq('id', user.id).single()
  if (!profile?.is_worship_team && profile?.role !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { data: ministers, error: minErr } = await supabaseAdmin
    .from('worship_bgv_ministers')
    .select('id, name, position')
    .eq('event_id', eventId)
    .order('position')

  if (minErr) return NextResponse.json({ error: minErr.message }, { status: 500 })

  const ministerIds = (ministers ?? []).map((m) => m.id)
  let singersMap: Record<string, { id: string; name: string; voice_part: string }[]> = {}

  if (ministerIds.length > 0) {
    const { data: singers, error: singErr } = await supabaseAdmin
      .from('worship_bgv_singers')
      .select('id, minister_id, name, voice_part')
      .in('minister_id', ministerIds)

    if (singErr) return NextResponse.json({ error: singErr.message }, { status: 500 })

    for (const s of singers ?? []) {
      if (!singersMap[s.minister_id]) singersMap[s.minister_id] = []
      singersMap[s.minister_id].push({ id: s.id, name: s.name, voice_part: s.voice_part })
    }
  }

  const result = (ministers ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    position: m.position,
    singers: singersMap[m.id] ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const body = await request.json()

  // Create minister
  if (body.event_id && body.name) {
    const { data: existing } = await supabaseAdmin
      .from('worship_bgv_ministers')
      .select('position')
      .eq('event_id', body.event_id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { data, error } = await supabaseAdmin
      .from('worship_bgv_ministers')
      .insert({ event_id: body.event_id, name: body.name, position: nextPos })
      .select('id, name, position')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, singers: [] }, { status: 201 })
  }

  // Create singer
  if (body.minister_id && body.name && body.voice_part) {
    const { data, error } = await supabaseAdmin
      .from('worship_bgv_singers')
      .insert({ minister_id: body.minister_id, name: body.name, voice_part: body.voice_part })
      .select('id, name, voice_part')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') // 'minister' or 'singer'
  if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 })

  const body = await request.json()

  if (type === 'minister') {
    const { data, error } = await supabaseAdmin
      .from('worship_bgv_ministers')
      .update({ name: body.name })
      .eq('id', id)
      .select('id, name, position')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (type === 'singer') {
    const update: { name?: string; voice_part?: string } = {}
    if (body.name !== undefined) update.name = body.name
    if (body.voice_part !== undefined) update.voice_part = body.voice_part

    const { data, error } = await supabaseAdmin
      .from('worship_bgv_singers')
      .update(update)
      .eq('id', id)
      .select('id, name, voice_part')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') // 'minister' or 'singer'
  if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 })

  const table = type === 'minister' ? 'worship_bgv_ministers' : 'worship_bgv_singers'
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
