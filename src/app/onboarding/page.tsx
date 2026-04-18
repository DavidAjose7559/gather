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

    if (!user) {
      router.push('/login')
      return
    }

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

  const inputStyle = {
    background: '#F5F3EF',
    border: '1px solid #E8E4DE',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '15px',
    color: '#1A1714',
    width: '100%',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#FAF9F7' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Heading */}
        <div className="text-center">
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1A1714', marginBottom: '6px' }}>
            Welcome to Gather
          </h1>
          <p style={{ fontSize: '15px', color: '#6B6560', lineHeight: 1.6 }}>
            A simple way to share how you&apos;re really doing with your group. Let&apos;s get you set up.
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
                htmlFor="fullName"
                style={{ fontSize: '13px', fontWeight: 500, color: '#6B6560', display: 'block', marginBottom: '6px' }}
              >
                Full name <span style={{ color: '#5B4FCF' }}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="displayName"
                style={{ fontSize: '13px', fontWeight: 500, color: '#6B6560', display: 'block', marginBottom: '6px' }}
              >
                Display name{' '}
                <span style={{ color: '#A8A29E', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How your group sees you"
                style={inputStyle}
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
              disabled={loading || !fullName.trim()}
              className="w-full min-h-[48px] rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)', fontWeight: 600, fontSize: '15px', marginTop: '4px' }}
            >
              {loading ? 'Setting up…' : 'Join Gather'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
