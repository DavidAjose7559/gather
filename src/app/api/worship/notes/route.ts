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

  return NextResponse.json(
    (notes ?? []).map((n) => ({ ...n, creator_name: creatorMap[n.created_by] ?? 'Unknown' }))
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user, error: authErr } = await verifyWorshipAccess(supabase)
  if (authErr) return authErr

  const { event_id, body, mentioned_user_ids } = await request.json()
  if (!event_id || !body?.trim()) return NextResponse.json({ error: 'event_id and body required' }, { status: 400 })

  const { data: note, error: dbErr } = await supabaseAdmin
    .from('worship_notes')
    .insert({ event_id, body: body.trim(), created_by: user!.id })
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const { data: creator } = await supabase.from('profiles').select('full_name, display_name').eq('id', user!.id).single()
  const creator_name = creator ? (creator.display_name ?? creator.full_name) : 'Someone'

  // Handle @mentions — store records and send emails
  const mentionIds: string[] = Array.isArray(mentioned_user_ids)
    ? mentioned_user_ids.filter((id) => id !== user!.id)
    : []

  if (mentionIds.length > 0) {
    await supabaseAdmin.from('worship_note_mentions').insert(
      mentionIds.map((id) => ({ note_id: note.id, profile_id: id }))
    )

    const [eventRes, profilesRes] = await Promise.all([
      supabaseAdmin.from('worship_events').select('title').eq('id', event_id).single(),
      supabaseAdmin.from('profiles').select('id, full_name, display_name, email').in('id', mentionIds),
    ])

    const eventTitle = eventRes.data?.title ?? 'a worship night'
    const eventLink = `${appUrl}/worship/${event_id}`
    const excerpt = body.trim().slice(0, 300) + (body.trim().length > 300 ? '…' : '')
    const mentionables = (profilesRes.data ?? []).filter((p) => p.email)

    if (mentionables.length > 0) {
      await resend.batch.send(
        mentionables.map((p) => ({
          from: fromEmail,
          to: p.email!,
          subject: `${creator_name} mentioned you — ${eventTitle}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
              <p style="font-size: 16px; margin-bottom: 8px;">
                Hey ${p.display_name ?? p.full_name.split(' ')[0]},
              </p>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px; color: #374151;">
                <strong>${creator_name}</strong> mentioned you in the planning notes for
                <strong>${eventTitle}</strong>.
              </p>
              <div style="background: #f3f4f6; border-left: 4px solid #6C63FF; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${excerpt}</div>
              <a href="${eventLink}" style="display: inline-block; background: #6C63FF; color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
                View in planner &rarr;
              </a>
            </div>`,
        }))
      )
    }
  }

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
