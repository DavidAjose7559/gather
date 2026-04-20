import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { todayToronto } from '@/lib/date'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayToronto()

  const [checkInsRes, grantsRes, currentProfileRes] = await Promise.all([
    supabase.from('check_ins').select('*').eq('check_in_date', today),
    supabase.from('visibility_grants').select('check_in_id, granted_to'),
    supabase.from('profiles').select('is_demo').eq('id', user.id).single(),
  ])

  const isCurrentUserDemo = currentProfileRes.data?.is_demo === true

  // Get demo user IDs to exclude their check-ins for non-demo viewers
  let demoUserIds: Set<string> = new Set()
  if (!isCurrentUserDemo) {
    const { data: demoProfiles } = await supabase.from('profiles').select('id').eq('is_demo', true)
    demoUserIds = new Set((demoProfiles ?? []).map((p) => p.id))
  }

  const rawCheckIns = checkInsRes.data ?? []
  const checkIns = isCurrentUserDemo
    ? rawCheckIns
    : rawCheckIns.filter((c) => !demoUserIds.has(c.user_id))
  const grants = grantsRes.data ?? []

  // Apply visibility filtering
  const visible = checkIns.filter((c) => {
    if (c.user_id === user.id) return true
    if (c.visibility_type === 'everyone') return true
    if (c.visibility_type === 'specific' || c.visibility_type === 'one_person') {
      return grants.some((g) => g.check_in_id === c.id && g.granted_to === user.id)
    }
    return false
  })

  // For check-ins not visible to current user, return minimal info (just user_id + date)
  const result = checkIns.map((c) => {
    const isVisible = visible.some((v) => v.id === c.id)
    if (isVisible) return c
    return {
      id: c.id,
      user_id: c.user_id,
      check_in_date: c.check_in_date,
      visibility_type: c.visibility_type,
      support_requested: false,
      _hidden: true,
    }
  })

  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('check_ins').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}
