import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { memberId, isWorshipOnly } = await request.json()
  if (!memberId || typeof isWorshipOnly !== 'boolean') {
    return NextResponse.json({ error: 'memberId and isWorshipOnly required' }, { status: 400 })
  }

  // When enabling worship-only, also ensure worship team access is granted
  const patch = isWorshipOnly
    ? { is_worship_only: true, is_worship_team: true }
    : { is_worship_only: false }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, is_worship_only: isWorshipOnly })
}
