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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { router.push('/login'); return }

    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
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
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Welcome to Gather</h1>
            <p style={{ fontSize: '15px', color: '#A0A0A0', lineHeight: 1.6 }}>
              A simple way to share how you&apos;re really doing with your group. Let&apos;s get you set up.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '1px solid #333333' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="fullName" style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '8px' }}>
                Full name <span style={{ color: '#6C63FF' }}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                style={{ width: '100%', padding: '14px 16px', fontSize: '16px' }}
              />
            </div>

            <div>
              <label htmlFor="displayName" style={{ fontSize: '13px', fontWeight: 500, color: '#A0A0A0', display: 'block', marginBottom: '8px' }}>
                Display name <span style={{ color: '#606060', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Nickname your group sees"
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
              disabled={loading || !fullName.trim()}
              className="w-full rounded-xl disabled:opacity-50"
              style={{ background: '#6C63FF', color: '#FFFFFF', fontWeight: 600, fontSize: '16px', padding: '16px', minHeight: '56px', marginTop: '4px' }}
            >
              {loading ? 'Setting up…' : 'Join Gather'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
