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

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
    }
  }, [searchParams, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://gatherdaily.app/auth/callback' },
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
        <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(108,99,255,0.15)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>Check your inbox</h2>
          <p style={{ fontSize: '15px', color: '#A0A0A0', lineHeight: 1.6 }}>
            We sent a login link to{' '}
            <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{email}</span>.
            Tap it to sign in — no password needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Logo area */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>Gather</h1>
            <p style={{ fontSize: '15px', color: '#A0A0A0' }}>Daily check-ins for your fellowship</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '8px' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', padding: '14px 16px', fontSize: '16px' }}
              />
            </div>

            {error && (
              <p className="rounded-xl px-4 py-3" style={{ fontSize: '14px', color: '#FF4D4D', background: '#2E1212', border: '1px solid #4A1F1F' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-xl disabled:opacity-50"
              style={{ background: '#6C63FF', color: '#FFFFFF', fontWeight: 600, fontSize: '16px', padding: '16px', minHeight: '56px' }}
            >
              {loading ? 'Sending…' : 'Send me a login link'}
            </button>
          </form>
        </div>

        <p style={{ fontSize: '13px', color: '#606060', textAlign: 'center' }}>
          No account yet? Just enter your email — we&apos;ll get you set up.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0A0A0A' }} />}>
      <LoginForm />
    </Suspense>
  )
}
