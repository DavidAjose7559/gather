import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { todayToronto } from '@/lib/date'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayToronto()

  const [checkInsRes, grantsRes] = await Promise.all([
    supabase.from('check_ins').select('*').eq('check_in_date', today),
    supabase.from('visibility_grants').select('check_in_id, granted_to'),
  ])

  const checkIns = checkInsRes.data ?? []
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
