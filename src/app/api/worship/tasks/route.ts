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

  const { data: tasks, error: dbErr } = await supabaseAdmin
    .from('worship_tasks')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Enrich with assignee names
  const assigneeIds = [...new Set((tasks ?? []).filter((t) => t.assigned_to).map((t) => t.assigned_to as string))]
  const assigneeMap: Record<string, string> = {}
  if (assigneeIds.length > 0) {
    const { data: assignees } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', assigneeIds)
    for (const a of assignees ?? []) {
      assigneeMap[a.id] = a.display_name ?? a.full_name
    }
  }

  const enriched = (tasks ?? []).map((t) => ({
    ...t,
    assignee_name: t.assigned_to ? (assigneeMap[t.assigned_to] ?? null) : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { event_id, title, assigned_to, due_date, notes } = await request.json()
  if (!event_id || !title) return NextResponse.json({ error: 'event_id and title required' }, { status: 400 })

  const { data, error: dbErr } = await supabaseAdmin
    .from('worship_tasks')
    .insert({ event_id, title, assigned_to: assigned_to ?? null, due_date: due_date ?? null, notes, status: 'todo' })
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  let assignee_name: string | null = null
  if (data.assigned_to) {
    const { data: p } = await supabaseAdmin.from('profiles').select('full_name, display_name').eq('id', data.assigned_to).single()
    assignee_name = p ? (p.display_name ?? p.full_name) : null
  }

  return NextResponse.json({ ...data, assignee_name }, { status: 201 })
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
    .from('worship_tasks')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  let assignee_name: string | null = null
  if (data.assigned_to) {
    const { data: p } = await supabaseAdmin.from('profiles').select('full_name, display_name').eq('id', data.assigned_to).single()
    assignee_name = p ? (p.display_name ?? p.full_name) : null
  }

  return NextResponse.json({ ...data, assignee_name })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbErr } = await supabaseAdmin.from('worship_tasks').delete().eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
