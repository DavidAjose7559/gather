'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={signOut}
      style={{
        fontSize: 14,
        color: 'var(--text-tertiary)',
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 20px',
        cursor: 'pointer',
        marginTop: 8,
      }}
    >
      Sign out
    </button>
  )
}
