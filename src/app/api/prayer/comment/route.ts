import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prayer_id, body } = await request.json()
  if (!prayer_id || !body?.trim()) {
    return NextResponse.json({ error: 'prayer_id and body required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('prayer_comments')
    .insert({ prayer_id, user_id: user.id, body: body.trim() })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
