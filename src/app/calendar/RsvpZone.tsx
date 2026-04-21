'use client'

import { useState } from 'react'
import type { EventWithMeta } from '@/lib/types'

const AREAS = [
  'Downtown Toronto',
  'North York',
  'Scarborough',
  'Etobicoke',
  'Mississauga',
  'Brampton',
  'Markham',
  'Richmond Hill',
  'Vaughan',
  'Other',
]

type RideStatus = 'driving' | 'need_ride' | 'own_way' | 'unsure'

const rideStatusLabel: Record<RideStatus, string> = {
  driving: 'Driving',
  need_ride: 'Need a ride',
  own_way: 'Going my own way',
  unsure: 'Not sure yet',
}

const rideStatusIcon: Record<RideStatus, string> = {
  driving: '🚗',
  need_ride: '🙋',
  own_way: '🚶',
  unsure: '🤔',
}

export default function RsvpZone({
  event,
  onRsvp,
}: {
  event: EventWithMeta
  onRsvp: (eventId: string, status: 'going' | 'maybe' | 'not_going' | null, rideStatus?: RideStatus | null, area?: string | null, canTake?: number | null) => void
}) {
  const [step, setStep] = useState<1 | 2 | null>(null)
  const [intent, setIntent] = useState<'going' | 'need_ride' | null>(null)
  const [area, setArea] = useState('')
  const [rideRole, setRideRole] = useState<'driving' | 'own_way' | 'unsure' | null>(null)
  const [canTake, setCanTake] = useState('')

  const hasRsvp = event.my_rsvp !== null

  function startRsvp() {
    setStep(1)
    setIntent(null)
    setArea(event.my_area ?? '')
    setRideRole(null)
    setCanTake('')
  }

  function pickIntent(picked: 'going' | 'need_ride' | 'maybe' | 'not_going') {
    if (picked === 'maybe') {
      onRsvp(event.id, 'maybe', null, null, null)
      setStep(null)
      return
    }
    if (picked === 'not_going') {
      onRsvp(event.id, 'not_going', null, null, null)
      setStep(null)
      return
    }
    setIntent(picked)
    setStep(2)
  }

  function confirm() {
    if (!intent) return
    if (intent === 'need_ride') {
      onRsvp(event.id, 'going', 'need_ride', area || null, null)
    } else {
      onRsvp(event.id, 'going', rideRole ?? 'unsure', area || null, rideRole === 'driving' && canTake ? parseInt(canTake) : null)
    }
    setStep(null)
    setIntent(null)
    setArea('')
    setRideRole(null)
    setCanTake('')
  }

  function cancel() {
    setStep(null)
    setIntent(null)
    setArea('')
    setRideRole(null)
    setCanTake('')
  }

  const btnBase: React.CSSProperties = {
    minHeight: 40,
    padding: '0 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }

  // Show status card if has RSVP and not editing
  if (hasRsvp && step === null) {
    const isGoing = event.my_rsvp === 'going'
    const rs = event.my_ride_status as RideStatus | null
    const statusColor = isGoing ? '#4CAF50' : event.my_rsvp === 'maybe' ? '#FF9500' : 'var(--text-tertiary)'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>
              {event.my_rsvp === 'going' ? (rs ? `${rideStatusIcon[rs]} ${rideStatusLabel[rs]}` : '✓ Going') : event.my_rsvp === 'maybe' ? 'Maybe' : "Can't make it"}
            </span>
            {isGoing && event.my_area && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>· {event.my_area}</span>
            )}
          </div>
          <button
            onClick={startRsvp}
            style={{ ...btnBase, border: '1px solid var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)', minHeight: 32, fontSize: 12 }}
          >
            Edit
          </button>
        </div>

        {/* My match status */}
        {event.my_match && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 13,
            backgroundColor: event.my_match.status === 'accepted' ? 'rgba(76,175,80,0.1)' : event.my_match.status === 'declined' ? 'rgba(255,77,77,0.1)' : 'rgba(108,99,255,0.1)',
            border: `1px solid ${event.my_match.status === 'accepted' ? 'rgba(76,175,80,0.3)' : event.my_match.status === 'declined' ? 'rgba(255,77,77,0.3)' : 'rgba(108,99,255,0.3)'}`,
            color: event.my_match.status === 'accepted' ? '#4CAF50' : event.my_match.status === 'declined' ? '#FF4D4D' : '#A09AF8',
          }}>
            {event.my_match.role === 'driver'
              ? event.my_match.status === 'pending' ? '🚗 You have a carpool match pending — check your email'
                : event.my_match.status === 'accepted' ? '🚗 You accepted to drive riders to this event'
                : '🚗 You declined the carpool match'
              : event.my_match.status === 'pending' ? '🙋 A driver has been matched — check your email to confirm'
                : event.my_match.status === 'accepted' ? '✓ Your ride is confirmed'
                : '❌ Your carpool match was declined — contact admin'}
          </div>
        )}
      </div>
    )
  }

  // Step 1: choose attendance status
  if (step === 1 || (!hasRsvp && step === null)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { key: 'going', label: '✓ Going' },
            { key: 'need_ride', label: '🙋 Need a Ride' },
            { key: 'maybe', label: 'Maybe' },
            { key: 'not_going', label: "Can't make it" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => pickIntent(key)}
              style={{
                ...btnBase,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-base)',
                color: 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {(step === 1 || hasRsvp) && (
          <button onClick={cancel} style={{ ...btnBase, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'left', padding: 0, minHeight: 24 }}>
            Cancel
          </button>
        )}
      </div>
    )
  }

  // Step 2: area + ride role
  if (step === 2) {
    const isNeedRide = intent === 'need_ride'
    const canConfirm = !!area

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: 'var(--bg-card-2)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {isNeedRide ? 'Where are you travelling from?' : 'A bit more info'}
        </p>

        <select
          value={area}
          onChange={e => setArea(e.target.value)}
          style={{ width: '100%', fontSize: 13 }}
        >
          <option value="">Select your area *</option>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {!isNeedRide && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>How are you getting there?</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['driving', 'own_way', 'unsure'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRideRole(r)}
                  style={{
                    ...btnBase,
                    border: rideRole === r ? '1px solid #6C63FF' : '1px solid var(--border)',
                    backgroundColor: rideRole === r ? 'rgba(108,99,255,0.15)' : 'var(--bg-base)',
                    color: rideRole === r ? '#A09AF8' : 'var(--text-secondary)',
                  }}
                >
                  {rideStatusIcon[r]} {r === 'own_way' ? 'Own way' : r === 'unsure' ? 'Not sure' : 'Driving'}
                </button>
              ))}
            </div>

            {rideRole === 'driving' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Seats available:</label>
                <input
                  type="number"
                  value={canTake}
                  onChange={e => setCanTake(e.target.value)}
                  min={1}
                  max={8}
                  placeholder="e.g. 3"
                  style={{ width: 80, fontSize: 13 }}
                />
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            style={{
              ...btnBase,
              flex: 1,
              backgroundColor: canConfirm ? '#6C63FF' : 'var(--bg-input)',
              color: canConfirm ? 'white' : 'var(--text-tertiary)',
              border: 'none',
              fontWeight: 600,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm
          </button>
          <button
            onClick={cancel}
            style={{ ...btnBase, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none' }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return null
}
