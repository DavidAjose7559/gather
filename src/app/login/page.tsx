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
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#FAF9F7' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✉️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1714', marginBottom: '8px' }}>
            Check your inbox
          </h2>
          <p style={{ fontSize: '14px', color: '#6B6560', lineHeight: 1.6 }}>
            We sent a login link to{' '}
            <span style={{ fontWeight: 500, color: '#1A1714' }}>{email}</span>.
            Tap it to sign in — no password needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#FAF9F7' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* App name + tagline */}
        <div className="text-center">
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1A1714', marginBottom: '6px' }}>
            Gather
          </h1>
          <p style={{ fontSize: '15px', color: '#6B6560', lineHeight: 1.6 }}>
            A quiet place to check in with yourself and your people.
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                style={{ fontSize: '13px', fontWeight: 500, color: '#6B6560', display: 'block', marginBottom: '6px' }}
              >
                Your email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  background: '#F5F3EF',
                  border: '1px solid #E8E4DE',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '15px',
                  color: '#1A1714',
                  width: '100%',
                }}
              />
            </div>

            {error && (
              <p
                className="rounded-xl px-3 py-2"
                style={{ fontSize: '13px', color: '#EF4444', background: '#FEF2F2' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full min-h-[48px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 600, fontSize: '15px' }}
            >
              {loading ? 'Sending…' : 'Send me a login link'}
            </button>
          </form>
        </div>

        <p style={{ fontSize: '13px', color: '#A8A29E', textAlign: 'center' }}>
          No account yet? Just enter your email — we&apos;ll get you set up.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#FAF9F7' }} />}>
      <LoginForm />
    </Suspense>
  )
}
