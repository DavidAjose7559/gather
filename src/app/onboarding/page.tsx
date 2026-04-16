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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Gather</h1>
          <p className="text-gray-500 leading-relaxed mb-1">
            Gather is a quiet daily check-in for your fellowship group — a simple way
            to share how you're really doing spiritually, emotionally, and physically.
          </p>
          <p className="text-gray-500 leading-relaxed">
            Your group shows up for each other here. Let's get you set up.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                What's your full name? <span className="text-indigo-600">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nickname or display name{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your group sees you"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="w-full min-h-[48px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl px-4 py-3 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
            >
              {loading ? 'Setting up…' : 'Join Gather'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
