'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const isFirstUser = count === 0

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName.trim(),
      display_name: displayName.trim() || null,
      email: user.email ?? null,
      role: isFirstUser ? 'admin' : 'member',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 448 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="15" y="2" width="6" height="32" rx="3" fill="#6C63FF"/>
              <rect x="2" y="13" width="32" height="6" rx="3" fill="#6C63FF"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'white', marginBottom: 12 }}>Welcome to Gather</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
            Gather is a quiet daily check-in for your fellowship group — a simple way
            to share how you&apos;re really doing spiritually, emotionally, and physically.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6 }}>
            Your group shows up for each other here. Let&apos;s get you set up.
          </p>
        </div>

        <div style={{ backgroundColor: '#1A1A1A', borderRadius: 24, border: '1px solid #2A2A2A', padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label htmlFor="fullName" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                What&apos;s your full name? <span style={{ color: '#6C63FF' }}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label htmlFor="displayName" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                Nickname or display name{' '}
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your group sees you"
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              style={{
                width: '100%',
                minHeight: 52,
                backgroundColor: '#6C63FF',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 14,
                border: 'none',
                cursor: loading || !fullName.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !fullName.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
                marginTop: 4,
              }}
            >
              {loading ? 'Setting up…' : 'Join Gather'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
