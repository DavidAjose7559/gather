import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prayer_id, answered_note } = await request.json()
  if (!prayer_id) return NextResponse.json({ error: 'prayer_id required' }, { status: 400 })

  const { error } = await supabase
    .from('prayer_requests')
    .update({
      is_answered: true,
      answered_note: answered_note?.trim() || null,
      answered_at: new Date().toISOString(),
    })
    .eq('id', prayer_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
