'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fallback: if Supabase sends the magic link to /login?code=... instead of
  // /auth/callback?code=..., forward the code to the real callback route.
  // Also surface ?error=auth as a visible message.
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
      return
    }
    if (searchParams.get('error') === 'auth') {
      setError('Something went wrong with your login link. Please try again.')
    }
  }, [searchParams, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://gatherdaily.app/auth/callback',
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: 448, backgroundColor: '#1A1A1A', borderRadius: 24, border: '1px solid #2A2A2A', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 8 }}>Check your inbox</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6 }}>
            We sent a login link to <span style={{ fontWeight: 600, color: 'white' }}>{email}</span>.
            Tap it to sign in — no password needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 448 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* Cross icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="15" y="2" width="6" height="32" rx="3" fill="#6C63FF"/>
              <rect x="2" y="13" width="32" height="6" rx="3" fill="#6C63FF"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: 'white', marginBottom: 10 }}>Gather</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6 }}>
            A quiet place to check in with yourself and your people.
          </p>
        </div>

        <div style={{ backgroundColor: '#1A1A1A', borderRadius: 24, border: '1px solid #2A2A2A', padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                Your email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%',
                minHeight: 52,
                backgroundColor: '#6C63FF',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 14,
                border: 'none',
                cursor: loading || !email ? 'not-allowed' : 'pointer',
                opacity: loading || !email ? 0.5 : 1,
                transition: 'opacity 0.2s',
                marginTop: 4,
              }}
            >
              {loading ? 'Sending…' : 'Send me a login link'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 24 }}>
          No account yet? Just enter your email — we&apos;ll get you set up.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }} />}>
      <LoginForm />
    </Suspense>
  )
}
