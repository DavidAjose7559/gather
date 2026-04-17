import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('schedule_id')
  if (!scheduleId) return NextResponse.json({ error: 'Missing schedule_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('sermon_discussions')
    .select('*, profiles(full_name, display_name)')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ discussions: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schedule_id, body } = await request.json()
  if (!schedule_id || !body?.trim()) {
    return NextResponse.json({ error: 'schedule_id and body required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sermon_discussions')
    .insert({ schedule_id, user_id: user.id, body: body.trim() })
    .select('*, profiles(full_name, display_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ discussion: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('sermon_discussions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
