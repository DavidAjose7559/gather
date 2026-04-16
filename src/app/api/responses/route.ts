import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const checkInId = searchParams.get('check_in_id')

  if (!checkInId) {
    return NextResponse.json({ error: 'check_in_id required' }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('responses')
    .select('id, check_in_id, body, is_anonymous, created_at, responder_id')
    .eq('check_in_id', checkInId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Strip responder_id for anonymous responses before sending to client
  const sanitized = (data ?? []).map((r) => ({
    id: r.id,
    check_in_id: r.check_in_id,
    body: r.body,
    is_anonymous: r.is_anonymous,
    created_at: r.created_at,
    responder_id: r.is_anonymous ? null : r.responder_id,
  }))

  return NextResponse.json(sanitized)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { check_in_id, responder_id, body: responseBody, is_anonymous } = body

  if (!check_in_id || !responseBody?.trim()) {
    return NextResponse.json({ error: 'check_in_id and body are required' }, { status: 400 })
  }

  if (responder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('responses')
    .insert({
      check_in_id,
      responder_id: user.id,
      body: responseBody.trim(),
      is_anonymous: !!is_anonymous,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
