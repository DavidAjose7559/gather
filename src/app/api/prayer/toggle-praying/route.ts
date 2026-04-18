import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { prayer_id } = await request.json()
    if (!prayer_id) return NextResponse.json({ error: 'prayer_id required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('prayer_praying')
      .select('id')
      .eq('prayer_id', prayer_id)
      .eq('user_id', user.id)
      .single()

    let praying: boolean
    if (existing) {
      await supabase.from('prayer_praying').delete().eq('id', existing.id)
      praying = false
    } else {
      await supabase.from('prayer_praying').insert({ prayer_id, user_id: user.id })
      praying = true
    }

    // Recount from source of truth to prevent count drift from race conditions
    const { count } = await supabase
      .from('prayer_praying')
      .select('*', { count: 'exact', head: true })
      .eq('prayer_id', prayer_id)

    const newCount = count ?? 0
    await supabase.from('prayer_requests').update({ praying_count: newCount }).eq('id', prayer_id)

    return NextResponse.json({ praying, count: newCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
