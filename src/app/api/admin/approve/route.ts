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

  const { data: admin } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (admin?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, accessType } = await request.json()
  if (!userId || !accessType) return NextResponse.json({ error: 'userId and accessType required' }, { status: 400 })

  const updates: Record<string, unknown> = { is_approved: true }

  if (accessType === 'gather') {
    updates.role = 'member'
    updates.is_worship_team = false
    updates.is_worship_only = false
  } else if (accessType === 'worship_only') {
    updates.role = 'member'
    updates.is_worship_team = true
    updates.is_worship_only = true
  } else if (accessType === 'both') {
    updates.role = 'member'
    updates.is_worship_team = true
    updates.is_worship_only = false
  } else if (accessType === 'admin') {
    updates.role = 'admin'
    updates.is_worship_team = true
    updates.is_worship_only = false
  } else {
    return NextResponse.json({ error: 'Invalid accessType' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
