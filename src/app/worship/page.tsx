import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WorshipMentionsBanner from './WorshipMentionsBanner'

type EventWithBudget = {
  id: string
  title: string
  event_date: string
  venue: string | null
  expected_guests: number | null
  theme: string | null
  status: 'planning' | 'confirmed' | 'done'
  worship_budget: { allocated: number; spent: number }[]
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  planning: { bg: 'rgba(255,149,0,0.15)', text: '#FF9500', label: 'Planning' },
  confirmed: { bg: 'rgba(76,175,80,0.15)', text: '#4CAF50', label: 'Confirmed' },
  done: { bg: 'rgba(96,96,96,0.2)', text: '#909090', label: 'Done' },
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function WorshipDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('worship_events')
    .select('*, worship_budget(allocated, spent)')
    .order('event_date', { ascending: false })

  const typedEvents = (events ?? []) as EventWithBudget[]

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '32px 20px 64px' }}>
      <WorshipMentionsBanner />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Worship Nights
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {typedEvents.length} event{typedEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/worship/new"
          style={{
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: 12,
            backgroundColor: '#6C63FF',
            color: '#fff',
            textDecoration: 'none',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          + New event
        </Link>
      </div>

      {typedEvents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🕊️</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            No worship nights yet
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 24 }}>
            Create your first event to start planning
          </p>
          <Link
            href="/worship/new"
            style={{
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 12,
              backgroundColor: '#6C63FF',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            + Create first event
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {typedEvents.map((event) => {
            const totalAllocated = event.worship_budget.reduce((s, b) => s + Number(b.allocated), 0)
            const totalSpent = event.worship_budget.reduce((s, b) => s + Number(b.spent), 0)
            const pct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0
            const barColor = pct >= 100 ? '#FF4D4D' : pct >= 80 ? '#FF9500' : '#4CAF50'
            const sc = statusColors[event.status]

            return (
              <Link
                key={event.id}
                href={`/worship/${event.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  padding: '20px 20px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
                        {event.title}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                        {formatDate(event.event_date)}
                        {event.venue ? ` · ${event.venue}` : ''}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 8,
                      backgroundColor: sc.bg,
                      color: sc.text,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {sc.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: event.worship_budget.length > 0 ? 12 : 0 }}>
                    {event.expected_guests != null && (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {event.expected_guests} expected guests
                      </span>
                    )}
                    {event.theme && (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.theme}
                      </span>
                    )}
                  </div>

                  {event.worship_budget.length > 0 && totalAllocated > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          Budget: ${totalSpent.toLocaleString()} of ${totalAllocated.toLocaleString()} spent
                        </span>
                        <span style={{ fontSize: 12, color: barColor, fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, backgroundColor: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
