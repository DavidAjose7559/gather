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

  const { data, error: dbErr } = await supabaseAdmin
    .from('worship_budget')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { event_id, category, allocated, spent, notes } = await request.json()
  if (!event_id || !category) return NextResponse.json({ error: 'event_id and category required' }, { status: 400 })

  const { data, error: dbErr } = await supabaseAdmin
    .from('worship_budget')
    .insert({ event_id, category, allocated: allocated ?? 0, spent: spent ?? 0, notes })
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await request.json()

  const { data, error: dbErr } = await supabaseAdmin
    .from('worship_budget')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbErr } = await supabaseAdmin.from('worship_budget').delete().eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
