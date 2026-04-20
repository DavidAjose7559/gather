import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { check_in_id } = await request.json()
  if (!check_in_id) return NextResponse.json({ error: 'check_in_id required' }, { status: 400 })

  const { error } = await supabase
    .from('checkin_seen')
    .upsert({ check_in_id, user_id: user.id }, { onConflict: 'check_in_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
