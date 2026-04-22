import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getCurrentUser(supabase: Awaited<ReturnType<typeof createClient>>) {
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
  const { user, error: authErr } = await getCurrentUser(supabase)
  if (authErr) return authErr

  const [noteMentionsRes, budgetMentionsRes] = await Promise.all([
    supabaseAdmin
      .from('worship_note_mentions')
      .select('id, created_at, note_id, worship_notes(body, event_id, created_by, worship_events(title))')
      .eq('profile_id', user!.id)
      .is('seen_at', null)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('worship_budget_mentions')
      .select('id, created_at, budget_item_id, worship_budget(notes, event_id, category, worship_events(title))')
      .eq('profile_id', user!.id)
      .is('seen_at', null)
      .order('created_at', { ascending: false }),
  ])

  type MentionItem = {
    id: string
    type: 'note' | 'budget'
    event_id: string
    event_title: string
    poster_name: string
    excerpt: string
    category?: string
    created_at: string
  }

  const results: MentionItem[] = []

  // Collect all poster IDs to batch-fetch names
  const posterIds = new Set<string>()
  for (const m of noteMentionsRes.data ?? []) {
    const note = m.worship_notes as unknown as { body: string; event_id: string; created_by: string; worship_events: { title: string } | null } | null
    if (note?.created_by) posterIds.add(note.created_by)
  }

  const posterMap: Record<string, string> = {}
  if (posterIds.size > 0) {
    const { data: posters } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', [...posterIds])
    for (const p of posters ?? []) {
      posterMap[p.id] = p.display_name ?? p.full_name
    }
  }

  for (const m of noteMentionsRes.data ?? []) {
    const note = m.worship_notes as unknown as { body: string; event_id: string; created_by: string; worship_events: { title: string } | null } | null
    if (!note?.event_id) continue
    const rawExcerpt = note.body ?? ''
    results.push({
      id: m.id,
      type: 'note',
      event_id: note.event_id,
      event_title: note.worship_events?.title ?? 'Worship Night',
      poster_name: posterMap[note.created_by] ?? 'Someone',
      excerpt: rawExcerpt.slice(0, 200) + (rawExcerpt.length > 200 ? '…' : ''),
      created_at: m.created_at,
    })
  }

  for (const m of budgetMentionsRes.data ?? []) {
    const item = m.worship_budget as unknown as { notes: string | null; event_id: string; category: string; worship_events: { title: string } | null } | null
    if (!item?.event_id) continue
    const rawExcerpt = item.notes ?? ''
    results.push({
      id: m.id,
      type: 'budget',
      event_id: item.event_id,
      event_title: item.worship_events?.title ?? 'Worship Night',
      poster_name: 'Someone',
      excerpt: rawExcerpt.slice(0, 200) + (rawExcerpt.length > 200 ? '…' : ''),
      category: item.category,
      created_at: m.created_at,
    })
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(results)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { user, error: authErr } = await getCurrentUser(supabase)
  if (authErr) return authErr

  const { id, type } = await request.json()
  if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 })

  const table = type === 'note' ? 'worship_note_mentions' : 'worship_budget_mentions'

  const { error: dbErr } = await supabaseAdmin
    .from(table)
    .update({ seen_at: new Date().toISOString() })
    .eq('id', id)
    .eq('profile_id', user!.id)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
