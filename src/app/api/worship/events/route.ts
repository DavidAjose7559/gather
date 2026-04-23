import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_BUDGET_CATEGORIES = [
  'Event Space',
  'Social Media / Marketing',
  'Gifts for Guests',
  'Sound & Equipment',
  'Decorations',
  'Catering / Refreshments',
  'Speaker / Artist Fees',
  'Miscellaneous',
]

async function verifyWorshipAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('profiles').select('role, is_worship_team').eq('id', user.id).single()
  if (!profile?.is_worship_team && profile?.role !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function GET() {
  const supabase = await createClient()
  const { user, error } = await verifyWorshipAccess(supabase)
  if (error) return error

  const { data: events, error: dbErr } = await supabaseAdmin
    .from('worship_events')
    .select('*, worship_budget(allocated, spent)')
    .order('event_date', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(events ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user, error } = await verifyWorshipAccess(supabase)
  if (error) return error

  const body = await request.json()
  const { title, event_date, venue, expected_guests, theme, notes, status } = body

  if (!title || !event_date) {
    return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 })
  }

  const { data: event, error: insertErr } = await supabaseAdmin
    .from('worship_events')
    .insert({ title, event_date, venue, expected_guests, theme, notes, status: status ?? 'planning', created_by: user!.id })
    .select('*')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Seed default budget categories
  const budgetRows = DEFAULT_BUDGET_CATEGORIES.map((category) => ({
    event_id: event.id,
    category,
    allocated: 0,
    spent: 0,
  }))
  await supabaseAdmin.from('worship_budget').insert(budgetRows)

  return NextResponse.json(event, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await request.json()
  const { title, event_date, venue, expected_guests, theme, notes, status, money_in_bank } = body

  const { data: updated, error: dbErr } = await supabaseAdmin
    .from('worship_events')
    .update({ title, event_date, venue, expected_guests, theme, notes, status, money_in_bank })
    .eq('id', id)
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbErr } = await supabaseAdmin.from('worship_events').delete().eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
