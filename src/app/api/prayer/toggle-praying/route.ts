import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prayer_id } = await request.json()
  if (!prayer_id) return NextResponse.json({ error: 'prayer_id required' }, { status: 400 })

  // Check if already praying
  const { data: existing } = await supabase
    .from('prayer_praying')
    .select('id')
    .eq('prayer_id', prayer_id)
    .eq('user_id', user.id)
    .single()

  // Get current count
  const { data: prayer } = await supabase
    .from('prayer_requests')
    .select('praying_count')
    .eq('id', prayer_id)
    .single()

  const currentCount = prayer?.praying_count ?? 0

  if (existing) {
    await supabase.from('prayer_praying').delete().eq('id', existing.id)
    await supabase
      .from('prayer_requests')
      .update({ praying_count: Math.max(0, currentCount - 1) })
      .eq('id', prayer_id)
    return NextResponse.json({ praying: false, count: Math.max(0, currentCount - 1) })
  } else {
    await supabase.from('prayer_praying').insert({ prayer_id, user_id: user.id })
    await supabase
      .from('prayer_requests')
      .update({ praying_count: currentCount + 1 })
      .eq('id', prayer_id)
    return NextResponse.json({ praying: true, count: currentCount + 1 })
  }
}
