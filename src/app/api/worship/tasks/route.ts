import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <noreply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

async function verifyWorshipAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role, is_worship_team').eq('id', user.id).single()
  if (!profile?.is_worship_team && profile?.role !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

async function sendAssignmentEmail(
  assigneeId: string,
  taskTitle: string,
  eventId: string,
  assignerId: string
) {
  const [assigneeRes, eventRes, assignerRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name, display_name, email').eq('id', assigneeId).single(),
    supabaseAdmin.from('worship_events').select('title').eq('id', eventId).single(),
    supabaseAdmin.from('profiles').select('full_name, display_name').eq('id', assignerId).single(),
  ])

  const assignee = assigneeRes.data
  if (!assignee?.email) return

  const eventTitle = eventRes.data?.title ?? 'a worship night'
  const assignerName = assignerRes.data
    ? (assignerRes.data.display_name ?? assignerRes.data.full_name)
    : 'Someone'
  const firstName = assignee.display_name ?? assignee.full_name.split(' ')[0]
  const eventLink = `${appUrl}/worship/${eventId}`

  await resend.emails.send({
    from: fromEmail,
    to: assignee.email,
    subject: `You've been assigned a task — ${eventTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <p style="font-size: 16px; margin-bottom: 8px;">Hey ${firstName},</p>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; color: #374151;">
          ${assigneeId === assignerId ? 'You assigned yourself a task for' : `<strong>${assignerName}</strong> assigned you a task for`} <strong>${eventTitle}</strong>.
        </p>
        <div style="background: #f3f4f6; border-left: 4px solid #6C63FF; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 15px; color: #374151; font-weight: 600;">
          ${taskTitle}
        </div>
        <a href="${eventLink}" style="display: inline-block; background: #6C63FF; color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          View in planner &rarr;
        </a>
      </div>`,
  })
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

  return NextResponse.json(
    (tasks ?? []).map((t) => ({
      ...t,
      assignee_name: t.assigned_to ? (assigneeMap[t.assigned_to] ?? null) : null,
    }))
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user, error: authErr } = await verifyWorshipAccess(supabase)
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
    // Fire-and-forget email
    sendAssignmentEmail(data.assigned_to, title, event_id, user!.id).catch(console.error)
  }

  return NextResponse.json({ ...data, assignee_name }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { user, error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await request.json()

  // Fetch current task to detect assignment changes
  const { data: existing } = await supabaseAdmin
    .from('worship_tasks')
    .select('assigned_to, title, event_id')
    .eq('id', id)
    .single()

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

    // Email only when assignment changes to someone new
    const assignmentChanged = body.assigned_to && body.assigned_to !== existing?.assigned_to
    if (assignmentChanged) {
      sendAssignmentEmail(data.assigned_to, data.title, data.event_id, user!.id).catch(console.error)
    }
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
