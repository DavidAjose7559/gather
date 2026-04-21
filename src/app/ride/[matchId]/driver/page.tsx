'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type MatchInfo = {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  event_title: string
  event_date: string
  driver_name: string
  driver_area: string | null
  riders: { name: string; area: string | null }[]
}

export default function DriverResponsePage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [match, setMatch] = useState<MatchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/ride/driver-info?match_id=${matchId}`)
      if (!res.ok) { setError('Match not found'); setLoading(false); return }
      const data = await res.json()
      setMatch(data)
      if (data.status !== 'pending') setDone(data.status)
      setLoading(false)
    }
    load()
  }, [matchId])

  async function respond(response: 'accept' | 'decline') {
    setSubmitting(true)
    const res = await fetch('/api/ride/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, role: 'driver', response }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSubmitting(false); return }
    setDone(response === 'accept' ? 'accepted' : 'declined')
    setSubmitting(false)
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    border: '1px solid #2A2A2A',
    padding: 32,
    maxWidth: 440,
    width: '100%',
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#666', textAlign: 'center' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#FF4D4D', textAlign: 'center' }}>{error ?? 'Something went wrong'}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>{done === 'accepted' ? '🚗' : '🙏'}</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>
              {done === 'accepted' ? "You're confirmed as a driver!" : 'No problem'}
            </h1>
            <p style={{ fontSize: 15, color: '#999', lineHeight: 1.6 }}>
              {done === 'accepted'
                ? `The riders have been notified and can confirm their seat. See you at ${match.event_title}!`
                : 'The admin has been notified and will arrange another match.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Gather · Ride Match</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>You've been matched as a driver</h1>
          <p style={{ fontSize: 15, color: '#999' }}>for <strong style={{ color: 'white' }}>{match.event_title}</strong> · {match.event_date}</p>
        </div>

        <div style={{ backgroundColor: '#111', borderRadius: 14, padding: '14px 16px', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {match.riders.length === 1 ? '1 rider' : `${match.riders.length} riders`} hoping to join you
          </p>
          {match.riders.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'white' }}>🙋 {r.name}</span>
              {r.area && <span style={{ fontSize: 12, color: '#666' }}>· {r.area}</span>}
            </div>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => respond('accept')}
            disabled={submitting}
            style={{ width: '100%', minHeight: 52, background: 'linear-gradient(135deg, #4f46e5, #9333ea)', color: 'white', fontWeight: 700, fontSize: 16, borderRadius: 14, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Submitting…' : '🚗 Accept — I can drive them'}
          </button>
          <button
            onClick={() => respond('decline')}
            disabled={submitting}
            style={{ width: '100%', minHeight: 52, backgroundColor: '#1f1f1f', color: '#999', fontWeight: 600, fontSize: 15, borderRadius: 14, border: '1px solid #2A2A2A', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
