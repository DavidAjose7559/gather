'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    emoji: '🙏🏾',
    title: 'Welcome to Gather',
    body: 'Every day, take less than a minute to check in and let your group know how you\'re doing — spiritually, emotionally, physically.',
    cta: 'Next →',
  },
  {
    emoji: '🤝',
    title: 'You choose what to share',
    body: 'Your check-in is yours. Share with everyone, just a few people, or just one person. Nobody is forced to be open — but the option is always there.',
    cta: 'Next →',
  },
  {
    emoji: '💜',
    title: 'Show up for each other',
    body: 'Respond to your group\'s check-ins. Leave encouragement, pray for someone, or just let them know you see them.',
    cta: 'Let\'s go →',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2 | 3>(0)

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
      is_approved: isFirstUser ? true : false,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Notify admin of new sign-up (not for the first/admin user)
    if (!isFirstUser) {
      fetch('/api/admin/notify-signup', { method: 'POST' }).catch(() => {})
    }

    setLoading(false)
    setTutorialStep(1)
  }

  // Tutorial screen
  if (tutorialStep >= 1) {
    const idx = tutorialStep - 1
    const step = STEPS[idx]
    const isLast = tutorialStep === 3

    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        {/* Skip */}
        <div style={{ position: 'fixed', top: 20, right: 20 }}>
          <button
            onClick={() => router.push('/')}
            style={{ fontSize: 14, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 8px' }}
          >
            Skip
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          <div style={{ fontSize: 64 }}>{step.emoji}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{step.title}</h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step.body}</p>
          </div>

          <button
            onClick={() => {
              if (isLast) router.push('/')
              else setTutorialStep((s) => (s + 1) as 1 | 2 | 3)
            }}
            style={{ width: '100%', minHeight: 56, backgroundColor: '#6C63FF', color: 'white', fontWeight: 700, fontSize: 17, borderRadius: 16, border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            {step.cta}
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === idx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === idx ? '#6C63FF' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Profile setup form
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 448 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="15" y="2" width="6" height="32" rx="3" fill="#6C63FF"/>
              <rect x="2" y="13" width="32" height="6" rx="3" fill="#6C63FF"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Welcome to Gather</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
            Gather is a quiet daily check-in for your fellowship group — a simple way
            to share how you&apos;re really doing spiritually, emotionally, and physically.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            Your group shows up for each other here. Let&apos;s get you set up.
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)', padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label htmlFor="fullName" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
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
              <label htmlFor="displayName" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Nickname or display name{' '}
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
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
