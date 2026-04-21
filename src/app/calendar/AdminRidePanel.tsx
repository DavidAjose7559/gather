'use client'

import { useEffect, useState } from 'react'
import type { EventWithMeta, AttendeeInfo } from '@/lib/types'

type RideMatchDetail = {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  driver_name: string
  driver_area: string | null
  members: { id: string; rsvp_id: string; name: string; area: string | null; status: 'pending' | 'accepted' | 'declined' }[]
}

type Suggestion = {
  driverRsvpId: string
  driverName: string
  driverArea: string
  canTake: number | null
  riders: AttendeeInfo[]
}

export default function AdminRidePanel({
  event,
  onAttendanceToggle,
  onMatchCreated,
}: {
  event: EventWithMeta
  onAttendanceToggle: (eventId: string, show: boolean) => void
  onMatchCreated: () => void
}) {
  const [matches, setMatches] = useState<RideMatchDetail[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  // Match creation state
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedRiders, setSelectedRiders] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const drivers = (event.attendance ?? []).filter(a => a.ride_status === 'driving')
  const needRide = (event.attendance ?? []).filter(a => a.ride_status === 'need_ride')

  const suggestions: Suggestion[] = drivers.map(driver => {
    const areaRiders = needRide.filter(r => r.area === driver.area)
    return {
      driverRsvpId: driver.rsvp_id,
      driverName: driver.name,
      driverArea: driver.area ?? '',
      canTake: null,
      riders: areaRiders,
    }
  }).filter(s => s.riders.length > 0)

  async function loadMatches() {
    setLoadingMatches(true)
    const res = await fetch(`/api/ride?event_id=${event.id}`)
    const data = await res.json()
    setMatches(data.matches ?? [])
    setLoadingMatches(false)
  }

  useEffect(() => {
    if (showPanel) loadMatches()
  }, [showPanel]) // eslint-disable-line react-hooks/exhaustive-deps

  async function createMatch() {
    if (!selectedDriver || selectedRiders.length === 0) return
    setCreating(true)
    setCreateError(null)
    const res = await fetch('/api/ride', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, driver_rsvp_id: selectedDriver, rider_rsvp_ids: selectedRiders }),
    })
    const data = await res.json()
    if (data.error) {
      setCreateError(data.error)
    } else {
      setSelectedDriver('')
      setSelectedRiders([])
      await loadMatches()
      onMatchCreated()
    }
    setCreating(false)
  }

  async function deleteMatch(matchId: string) {
    await fetch(`/api/ride?id=${matchId}`, { method: 'DELETE' })
    setMatches(prev => prev.filter(m => m.id !== matchId))
    onMatchCreated()
  }

  const rideSummary = event.ride_summary
  const attendees = event.attendance ?? []
  const unmatched = needRide.filter(r => !matches.some(m => m.members.some(mem => mem.rsvp_id === r.rsvp_id)))

  const statusColor = { pending: '#FF9500', accepted: '#4CAF50', declined: '#FF4D4D' }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Admin · Ride Coordination
        </span>
        <button
          onClick={() => setShowPanel(v => !v)}
          style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          {showPanel ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Quick stats always visible */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {rideSummary.driving > 0 && (
          <span style={{ fontSize: 12, color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(76,175,80,0.2)' }}>
            🚗 {rideSummary.driving} driving
          </span>
        )}
        {rideSummary.need_ride > 0 && (
          <span style={{ fontSize: 12, color: '#A09AF8', backgroundColor: 'rgba(108,99,255,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(108,99,255,0.2)' }}>
            🙋 {rideSummary.need_ride} need ride
          </span>
        )}
        {rideSummary.own_way > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            🚶 {rideSummary.own_way} own way
          </span>
        )}
        {rideSummary.unsure > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-input)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            🤔 {rideSummary.unsure} unsure
          </span>
        )}
      </div>

      {/* Attendance toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Show attendance to members</span>
        <button
          onClick={() => onAttendanceToggle(event.id, !event.show_attendance)}
          style={{
            minWidth: 44,
            minHeight: 26,
            borderRadius: 13,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: event.show_attendance ? '#4CAF50' : 'var(--bg-input)',
            position: 'relative',
            transition: 'background-color 0.2s',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: event.show_attendance ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'white',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {showPanel && (
        <>
          {/* Attendance list */}
          {attendees.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Going ({attendees.length})</p>
              {attendees.map(a => (
                <div key={a.rsvp_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{a.name}</span>
                  {a.area && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.area}</span>}
                  {a.ride_status && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      {a.ride_status === 'driving' ? '🚗' : a.ride_status === 'need_ride' ? '🙋' : a.ride_status === 'own_way' ? '🚶' : '🤔'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Auto-suggestions */}
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggested matches</p>
              {suggestions.map(s => (
                <div key={s.driverRsvpId} style={{ backgroundColor: 'var(--bg-base)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    <strong>{s.driverName}</strong> ({s.driverArea}) → {s.riders.map(r => r.name).join(', ')}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDriver(s.driverRsvpId)
                      setSelectedRiders(s.riders.map(r => r.rsvp_id))
                    }}
                    style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    Use this suggestion →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Unmatched need-ride */}
          {unmatched.length > 0 && (
            <div style={{ backgroundColor: 'rgba(255,153,0,0.08)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,153,0,0.2)' }}>
              <p style={{ fontSize: 12, color: '#FF9500', fontWeight: 600, marginBottom: 4 }}>
                {unmatched.length} unmatched {unmatched.length === 1 ? 'rider' : 'riders'}:
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{unmatched.map(r => r.name).join(', ')}</p>
            </div>
          )}

          {/* Match creation form */}
          {drivers.length > 0 && needRide.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: 'var(--bg-card-2)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Create Match</p>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Driver</label>
                <select
                  value={selectedDriver}
                  onChange={e => setSelectedDriver(e.target.value)}
                  style={{ width: '100%', fontSize: 13 }}
                >
                  <option value="">Select driver…</option>
                  {drivers.map(d => (
                    <option key={d.rsvp_id} value={d.rsvp_id}>{d.name}{d.area ? ` (${d.area})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Riders (select all that apply)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {needRide.map(r => (
                    <label key={r.rsvp_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedRiders.includes(r.rsvp_id)}
                        onChange={e => setSelectedRiders(prev => e.target.checked ? [...prev, r.rsvp_id] : prev.filter(id => id !== r.rsvp_id))}
                      />
                      {r.name}{r.area ? ` · ${r.area}` : ''}
                    </label>
                  ))}
                </div>
              </div>

              {createError && (
                <p style={{ fontSize: 12, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 8, padding: '6px 10px' }}>{createError}</p>
              )}

              <button
                onClick={createMatch}
                disabled={creating || !selectedDriver || selectedRiders.length === 0}
                style={{
                  minHeight: 40,
                  backgroundColor: creating || !selectedDriver || selectedRiders.length === 0 ? 'var(--bg-input)' : '#6C63FF',
                  color: creating || !selectedDriver || selectedRiders.length === 0 ? 'var(--text-tertiary)' : 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: creating || !selectedDriver || selectedRiders.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Creating…' : 'Create match & notify driver'}
              </button>
            </div>
          )}

          {/* Existing matches */}
          {loadingMatches ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading matches…</p>
          ) : matches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ride matches</p>
              {matches.map(m => (
                <div key={m.id} style={{ backgroundColor: 'var(--bg-base)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        🚗 {m.driver_name}{m.driver_area ? ` (${m.driver_area})` : ''}
                        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor[m.status], marginLeft: 8 }}>· {m.status}</span>
                      </p>
                      {m.members.map(mem => (
                        <p key={mem.id} style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          → {mem.name}{mem.area ? ` (${mem.area})` : ''} · <span style={{ color: statusColor[mem.status] }}>{mem.status}</span>
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={() => deleteMatch(m.id)}
                      style={{ fontSize: 11, color: 'rgba(255,77,77,0.6)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
