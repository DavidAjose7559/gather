import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from './SignOutButton'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const firstName = profile.display_name ?? profile.full_name.split(' ')[0]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.2))',
          border: '1px solid rgba(108,99,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
        }}>
          🕐
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            You&apos;re on the list, {firstName}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Your account is pending approval. An admin will review it and give you access shortly.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            You&apos;ll be able to sign in and access the app once you&apos;re approved — no action needed on your end.
          </p>
        </div>

        <SignOutButton />
      </div>
    </div>
  )
}
