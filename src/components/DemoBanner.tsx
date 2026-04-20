import { createClient } from '@/lib/supabase/server'

export default async function DemoBanner() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_demo')
      .eq('id', user.id)
      .single()

    if (!profile?.is_demo) return null

    return (
      <div style={{
        width: '100%',
        backgroundColor: '#2E1E00',
        padding: '10px 16px',
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <p style={{ color: '#FF9500', fontSize: 13, fontWeight: 500, margin: 0 }}>
          You&apos;re exploring Gather in demo mode — your activity is hidden from real members
        </p>
      </div>
    )
  } catch {
    return null
  }
}
