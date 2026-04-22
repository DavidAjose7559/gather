import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Time with Jesus' }

export default async function WorshipLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_worship_team')
    .eq('id', user.id)
    .single()

  if (!profile?.is_worship_team && profile?.role !== 'admin') redirect('/')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 768,
          margin: '0 auto',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/worship" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Time with Jesus
            </span>
          </Link>
          <Link
            href="/"
            style={{
              fontSize: 14,
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              minHeight: 44,
            }}
          >
            ← Gather
          </Link>
        </div>
      </div>
      {children}
    </div>
  )
}
