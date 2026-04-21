'use client'

import { useState } from 'react'
import Link from 'next/link'

type EventItem = {
  id: string
  title: string
  event_date: string
  event_time: string | null
  days: number
  my_rsvp: 'going' | 'maybe' | 'not_going' | null
  my_ride_status: 'driving' | 'need_ride' | 'own_way' | 'unsure' | null
  my_match: { id: string; status: 'pending' | 'accepted' | 'declined'; role: 'driver' | 'rider' } | null
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysLabel(days: number) {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

export default function UpcomingEventsBanner({ events: initialEvents }: { events: EventItem[] }) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents)

  async function quickRsvp(eventId: string, status: 'going' | 'maybe' | 'not_going') {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    const newStatus = event.my_rsvp === status ? null : status

    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, my_rsvp: newStatus } : e))

    const res = await fetch('/api/events/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, status: newStatus }),
    })
    if (!res.ok) {
      setEvents(prev => prev.map(e => e.id === eventId ? event : e))
    }
  }

  if (events.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map(event => {
        const [, em, ed] = event.event_date.split('-').map(Number)
        const isGoing = event.my_rsvp === 'going'
        const hasMaybe = event.my_rsvp === 'maybe'

        return (
          <div
            key={event.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border)',
              borderLeft: '3px solid #6C63FF',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{event.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  📅 {MONTH_SHORT[em - 1]} {ed}{event.event_time && ` · ${event.event_time}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#6C63FF', fontWeight: 600 }}>{daysLabel(event.days)}</span>
                <Link href="/calendar" style={{ fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>View →</Link>
              </div>
            </div>

            {/* Quick RSVP buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => quickRsvp(event.id, 'going')}
                style={{
                  minHeight: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: isGoing ? '1px solid #4CAF50' : '1px solid var(--border)',
                  backgroundColor: isGoing ? 'rgba(76,175,80,0.15)' : 'var(--bg-base)',
                  color: isGoing ? '#4CAF50' : 'var(--text-secondary)',
                }}
              >
                {isGoing ? '✓ Going' : 'Going'}
              </button>
              <button
                onClick={() => quickRsvp(event.id, 'maybe')}
                style={{
                  minHeight: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: hasMaybe ? '1px solid #FF9500' : '1px solid var(--border)',
                  backgroundColor: hasMaybe ? 'rgba(255,153,0,0.15)' : 'var(--bg-base)',
                  color: hasMaybe ? '#FF9500' : 'var(--text-secondary)',
                }}
              >
                Maybe
              </button>
              <Link
                href="/calendar"
                style={{
                  minHeight: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                More options
              </Link>
            </div>

            {/* Ride match status */}
            {event.my_match && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                backgroundColor: event.my_match.status === 'accepted' ? 'rgba(76,175,80,0.1)' : 'rgba(108,99,255,0.1)',
                border: `1px solid ${event.my_match.status === 'accepted' ? 'rgba(76,175,80,0.3)' : 'rgba(108,99,255,0.3)'}`,
                color: event.my_match.status === 'accepted' ? '#4CAF50' : '#A09AF8',
              }}>
                {event.my_match.role === 'driver'
                  ? event.my_match.status === 'accepted' ? '🚗 You\'re driving to this event'
                    : '🚗 Carpool match pending — check your email'
                  : event.my_match.status === 'accepted' ? '✓ Your ride is confirmed'
                    : '🙋 Ride match pending — check your email'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
