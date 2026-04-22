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
  const eventId = searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const { data: notes, error: dbErr } = await supabaseAdmin
    .from('worship_notes')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const creatorIds = [...new Set((notes ?? []).map((n) => n.created_by))]
  const creatorMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: creators } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', creatorIds)
    for (const c of creators ?? []) {
      creatorMap[c.id] = c.display_name ?? c.full_name
    }
  }

  const enriched = (notes ?? []).map((n) => ({
    ...n,
    creator_name: creatorMap[n.created_by] ?? 'Unknown',
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user, error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { event_id, body } = await request.json()
  if (!event_id || !body?.trim()) return NextResponse.json({ error: 'event_id and body required' }, { status: 400 })

  const { data: note, error: dbErr } = await supabaseAdmin
    .from('worship_notes')
    .insert({ event_id, body: body.trim(), created_by: user!.id })
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const { data: creator } = await supabase.from('profiles').select('full_name, display_name').eq('id', user!.id).single()
  const creator_name = creator ? (creator.display_name ?? creator.full_name) : 'You'

  return NextResponse.json({ ...note, creator_name }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbErr } = await supabaseAdmin.from('worship_notes').delete().eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
