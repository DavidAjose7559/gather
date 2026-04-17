import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { todayToronto } from '@/lib/date'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayToronto()
  const { data, error } = await supabase
    .from('sermon_schedule')
    .select('*')
    .eq('schedule_date', today)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sermon: data ?? null })
}
