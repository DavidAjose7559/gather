'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayToronto } from '@/lib/date'
import BottomNav from '@/components/BottomNav'
import type { Birthday, EventWithMeta } from '@/lib/types'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysUntilBirthday(month: number, day: number, todayStr: string): number {
  const [y, m, d] = todayStr.split('-').map(Number)
  const todayDate = new Date(Date.UTC(y, m - 1, d))
  let next = new Date(Date.UTC(y, month - 1, day))
  if (next < todayDate) next = new Date(Date.UTC(y + 1, month - 1, day))
  return Math.round((next.getTime() - todayDate.getTime()) / 86400000)
}

function daysUntilDate(dateStr: string, todayStr: string): number {
  const [ey, em, ed] = dateStr.split('-').map(Number)
  const [ty, tm, td] = todayStr.split('-').map(Number)
  return Math.round(
    (new Date(Date.UTC(ey, em - 1, ed)).getTime() - new Date(Date.UTC(ty, tm - 1, td)).getTime()) / 86400000
  )
}

function daysLabel(days: number): string {
  if (days === 0) return 'today 🎉'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

function formatSelectedDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  return `${dayNames[date.getUTCDay()]}, ${MONTH_NAMES[m - 1]} ${d}`
}

type GridCell = {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hasBirthday: boolean
  hasEvent: boolean
}

function buildCalendarGrid(
  year: number,
  month: number,
  birthdays: Birthday[],
  events: EventWithMeta[],
  todayStr: string
): GridCell[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
  const eventDateSet = new Set(events.map(e => e.event_date))

  const cells: GridCell[] = []
  for (let i = 0; i < 42; i++) {
    const dayOffset = i - firstDay
    let day: number, cellMonth: number, cellYear: number, isCurrentMonth: boolean

    if (dayOffset < 0) {
      day = prevMonthDays + dayOffset + 1
      cellMonth = month === 1 ? 12 : month - 1
      cellYear = month === 1 ? year - 1 : year
      isCurrentMonth = false
    } else if (dayOffset >= daysInMonth) {
      day = dayOffset - daysInMonth + 1
      cellMonth = month === 12 ? 1 : month + 1
      cellYear = month === 12 ? year + 1 : year
      isCurrentMonth = false
    } else {
      day = dayOffset + 1
      cellMonth = month
      cellYear = year
      isCurrentMonth = true
    }

    const dateStr = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      date: dateStr,
      day,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      hasBirthday: birthdays.some(b => b.month === cellMonth && b.day === day),
      hasEvent: eventDateSet.has(dateStr),
    })
  }
  return cells
}

function RsvpButtons({
  event,
  onRsvp,
}: {
  event: EventWithMeta
  onRsvp: (eventId: string, status: 'going' | 'maybe' | 'not_going') => void
}) {
  const buttons: { status: 'going' | 'maybe' | 'not_going'; label: string }[] = [
    { status: 'going', label: 'Going' },
    { status: 'maybe', label: 'Maybe' },
    { status: 'not_going', label: "Can't make it" },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {buttons.map(({ status, label }) => {
        const isActive = event.my_rsvp === status
        const isGoing = status === 'going'
        return (
          <button
            key={status}
            onClick={() => onRsvp(event.id, status)}
            style={{
              minHeight: 36,
              padding: '0 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              border: isActive
                ? isGoing ? '1px solid #4CAF50' : '1px solid #6C63FF'
                : '1px solid #2A2A2A',
              backgroundColor: isActive
                ? isGoing ? 'rgba(76,175,80,0.15)' : 'rgba(108,99,255,0.15)'
                : '#111111',
              color: isActive
                ? isGoing ? '#4CAF50' : '#A09AF8'
                : 'rgba(255,255,255,0.5)',
            }}
          >
            {isActive && isGoing ? '✓ ' : ''}{label}
          </button>
        )
      })}
    </div>
  )
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [events, setEvents] = useState<EventWithMeta[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Month grid state
  const [viewedYear, setViewedYear] = useState(0)
  const [viewedMonth, setViewedMonth] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Month collapsible state — current month expanded by default
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set())

  // Admin add event form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    const todayStr = todayToronto()
    setToday(todayStr)
    const [ty, tm] = todayStr.split('-').map(Number)
    setViewedYear(ty)
    setViewedMonth(tm)
    const currentMonth = parseInt(todayStr.split('-')[1])
    setExpandedMonths(new Set([currentMonth]))

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [profileRes, birthdaysRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        fetch('/api/birthdays').then(r => r.json()),
        fetch('/api/events').then(r => r.json()),
      ])

      if (profileRes.data) setIsAdmin(profileRes.data.role === 'admin')
      setBirthdays(birthdaysRes.birthdays ?? [])
      setEvents(eventsRes.events ?? [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select today if it has a birthday or event
  useEffect(() => {
    if (!loading && today) {
      const [, tm, td] = today.split('-').map(Number)
      const todayHasBirthday = birthdays.some(b => b.month === tm && b.day === td)
      const todayHasEvent = events.some(e => e.event_date === today)
      if (todayHasBirthday || todayHasEvent) {
        setSelectedDate(today)
      }
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    if (viewedMonth === 1) { setViewedMonth(12); setViewedYear(y => y - 1) }
    else setViewedMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (viewedMonth === 12) { setViewedMonth(1); setViewedYear(y => y + 1) }
    else setViewedMonth(m => m + 1)
    setSelectedDate(null)
  }

  async function toggleRsvp(eventId: string, status: 'going' | 'maybe' | 'not_going') {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    const newStatus = event.my_rsvp === status ? null : status

    // Optimistic update
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e
      const counts = { ...e.rsvp_counts }
      if (e.my_rsvp) counts[e.my_rsvp]--
      if (newStatus) counts[newStatus]++
      return { ...e, my_rsvp: newStatus, rsvp_counts: counts }
    }))

    const res = await fetch('/api/events/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, status: newStatus }),
    })
    if (!res.ok) {
      // Revert on failure
      setEvents(prev => prev.map(e => e.id === eventId ? event : e))
    }
  }

  async function addEvent() {
    if (!newTitle.trim() || !newDate) return
    setSaving(true)
    setAddError(null)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        event_date: newDate,
        event_time: newTime.trim() || null,
        location: newLocation.trim() || null,
        description: newDesc.trim() || null,
      }),
    })
    const data = await res.json()
    if (data.error) {
      setAddError(data.error)
    } else {
      const newEvent: EventWithMeta = {
        ...data.event,
        rsvp_counts: { going: 0, maybe: 0, not_going: 0 },
        my_rsvp: null,
      }
      setEvents(prev => [...prev, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setNewTitle('')
      setNewDate('')
      setNewTime('')
      setNewLocation('')
      setNewDesc('')
      setShowAddForm(false)
    }
    setSaving(false)
  }

  async function deleteEvent(eventId: string) {
    const res = await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' })
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  function toggleMonth(month: number) {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
      </div>
    )
  }

  const cardStyle = {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    border: '1px solid #2A2A2A',
  }

  // Build grid
  const gridCells = viewedYear && viewedMonth
    ? buildCalendarGrid(viewedYear, viewedMonth, birthdays, events, today)
    : []

  // Selected date content
  const selParts = selectedDate ? selectedDate.split('-').map(Number) : null
  const selBirthdays = selParts
    ? birthdays.filter(b => b.month === selParts[1] && b.day === selParts[2])
    : []
  const selEvents = selectedDate ? events.filter(e => e.event_date === selectedDate) : []

  // Upcoming items: birthdays within 30 days + events within 30 days, sorted by days
  const upcomingBirthdays = birthdays
    .map(b => ({ type: 'birthday' as const, ...b, days: daysUntilBirthday(b.month, b.day, today) }))
    .filter(b => b.days <= 30)

  const upcomingEvents = events
    .filter(e => {
      const days = daysUntilDate(e.event_date, today)
      return days >= 0 && days <= 30
    })
    .map(e => ({ type: 'event' as const, ...e, days: daysUntilDate(e.event_date, today) }))

  const upcomingItems = [...upcomingBirthdays, ...upcomingEvents].sort((a, b) => a.days - b.days)
  const todayBirthdays = upcomingBirthdays.filter(b => b.days === 0)

  // Birthdays grouped by month
  const birthdaysByMonth: Record<number, Birthday[]> = {}
  for (let m = 1; m <= 12; m++) {
    birthdaysByMonth[m] = birthdays.filter(b => b.month === m).sort((a, b) => a.day - b.day)
  }

  // Future events only
  const futureEvents = events.filter(e => daysUntilDate(e.event_date, today) >= 0)

  const rsvpSummary = (e: EventWithMeta) => {
    const parts: string[] = []
    if (e.rsvp_counts.going > 0) parts.push(`${e.rsvp_counts.going} going`)
    if (e.rsvp_counts.maybe > 0) parts.push(`${e.rsvp_counts.maybe} maybe`)
    if (e.rsvp_counts.not_going > 0) parts.push(`${e.rsvp_counts.not_going} can't make it`)
    return parts.join(' · ')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', paddingBottom: 96 }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ─── HEADER ─── */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white' }}>Calendar</h1>

        {/* ─── MONTH GRID ─── */}
        {viewedYear > 0 && viewedMonth > 0 && (
          <div>
            {/* Grid card */}
            <div style={{ backgroundColor: '#111111', borderRadius: 20, border: '1px solid #2A2A2A', overflow: 'hidden' }}>
              {/* Month navigation header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 12px' }}>
                <button
                  onClick={prevMonth}
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 20, borderRadius: 10 }}
                >
                  ‹
                </button>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                    {MONTH_NAMES[viewedMonth - 1]} {viewedYear}
                  </p>
                  {(viewedYear !== parseInt(today.split('-')[0]) || viewedMonth !== parseInt(today.split('-')[1])) && (
                    <button
                      onClick={() => {
                        const [ty, tm] = today.split('-').map(Number)
                        setViewedYear(ty)
                        setViewedMonth(tm)
                        setSelectedDate(null)
                      }}
                      style={{ fontSize: 11, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, fontWeight: 500 }}
                    >
                      today
                    </button>
                  )}
                </div>
                <button
                  onClick={nextMonth}
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 20, borderRadius: 10 }}
                >
                  ›
                </button>
              </div>

              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', paddingBottom: 4 }}>
                {DAY_LABELS.map(label => (
                  <div key={label} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', paddingBottom: 6 }}>
                    {label}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 4px 8px' }}>
                {gridCells.map((cell, i) => {
                  const isSelected = selectedDate === cell.date
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 44,
                        background: 'none',
                        border: isSelected ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                        borderRadius: 10,
                        cursor: 'pointer',
                        padding: '4px 0',
                        gap: 3,
                      }}
                    >
                      <span style={{
                        width: 30,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: cell.isToday ? '#6C63FF' : 'transparent',
                        fontSize: 13,
                        fontWeight: cell.isToday ? 700 : 400,
                        color: cell.isToday
                          ? 'white'
                          : cell.isCurrentMonth
                          ? 'rgba(255,255,255,0.9)'
                          : '#404040',
                      }}>
                        {cell.day}
                      </span>
                      <div style={{ display: 'flex', gap: 3, height: 5, alignItems: 'center' }}>
                        {cell.hasBirthday && (
                          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#FF9500' }} />
                        )}
                        {cell.hasEvent && (
                          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#A09AF8' }} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF9500' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Birthday</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#A09AF8' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Event</span>
              </div>
            </div>

            {/* Selected date panel */}
            {selectedDate && (
              <div style={{ marginTop: 12, backgroundColor: '#1A1A1A', borderRadius: 16, border: '1px solid #2A2A2A', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{formatSelectedDate(selectedDate)}</p>
                  <button
                    onClick={() => setSelectedDate(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                  >
                    ×
                  </button>
                </div>
                {selBirthdays.length === 0 && selEvents.length === 0 && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Nothing scheduled</p>
                )}
                {selBirthdays.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF9500', flexShrink: 0 }} />
                    <p style={{ fontSize: 14, color: 'white' }}>{b.name}&apos;s birthday 🎂</p>
                  </div>
                ))}
                {selEvents.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#A09AF8', flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <p style={{ fontSize: 14, color: 'white' }}>{e.title}</p>
                      {(e.event_time || e.location) && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          {[e.event_time, e.location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── SECTION 1: UPCOMING ─── */}
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Upcoming — next 30 days
          </h2>

          {/* Today's birthday celebratory cards */}
          {todayBirthdays.map(b => (
            <div key={b.id} style={{ backgroundColor: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 16, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🎉</span>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#4CAF50' }}>
                {b.name}&apos;s birthday is today! 🎂
              </p>
            </div>
          ))}

          {upcomingItems.length === 0 ? (
            <div style={{ ...cardStyle, padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Nothing in the next 30 days.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingItems.map((item, i) => {
                if (item.type === 'birthday') {
                  return (
                    <div key={`bd-${item.id}-${i}`} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid #FF9500' }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>🎂</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{item.name}&apos;s birthday</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          {MONTH_SHORT[item.month - 1]} {item.day}
                        </p>
                      </div>
                      <span style={{ fontSize: 12, color: item.days === 0 ? '#4CAF50' : '#FF9500', fontWeight: 600, flexShrink: 0 }}>
                        {daysLabel(item.days)}
                      </span>
                    </div>
                  )
                } else {
                  // Event item
                  const ev = item as typeof item & EventWithMeta
                  const [, em, ed] = ev.event_date.split('-').map(Number)
                  return (
                    <div key={`ev-${ev.id}-${i}`} style={{ ...cardStyle, padding: '14px 16px', borderLeft: '3px solid #6C63FF', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>📅</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{ev.title}</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            {MONTH_SHORT[em - 1]} {ed}
                            {ev.event_time && ` · ${ev.event_time}`}
                            {ev.location && ` · ${ev.location}`}
                          </p>
                        </div>
                        <span style={{ fontSize: 12, color: '#6C63FF', fontWeight: 600, flexShrink: 0 }}>
                          {daysLabel(ev.days)}
                        </span>
                      </div>
                      <RsvpButtons event={ev} onRsvp={toggleRsvp} />
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>

        {/* ─── SECTION 2: BIRTHDAY CALENDAR ─── */}
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Birthday calendar
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {MONTH_NAMES.map((monthName, idx) => {
              const month = idx + 1
              const monthBirthdays = birthdaysByMonth[month] ?? []
              if (monthBirthdays.length === 0) return null
              const isExpanded = expandedMonths.has(month)
              const currentMonth = today ? parseInt(today.split('-')[1]) : 0

              return (
                <div key={month} style={{ ...cardStyle, overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleMonth(month)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      minHeight: 48,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: month === currentMonth ? '#6C63FF' : 'white' }}>
                      {monthName}
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                        {monthBirthdays.length} {monthBirthdays.length === 1 ? 'birthday' : 'birthdays'}
                      </span>
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #2A2A2A' }}>
                      {monthBirthdays.map((b, bi) => {
                        const days = today ? daysUntilBirthday(b.month, b.day, today) : null
                        const isToday = days === 0
                        return (
                          <div
                            key={b.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '11px 16px',
                              borderBottom: bi < monthBirthdays.length - 1 ? '1px solid #222' : 'none',
                              backgroundColor: isToday ? 'rgba(76,175,80,0.05)' : 'transparent',
                            }}
                          >
                            <p style={{ flex: 1, fontSize: 14, color: isToday ? '#4CAF50' : 'white', fontWeight: isToday ? 600 : 400 }}>
                              {MONTH_SHORT[b.month - 1]} {b.day} — {b.name}
                              {isToday && ' 🎉'}
                            </p>
                            {days !== null && days <= 14 && days > 0 && (
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                                {daysLabel(days)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── SECTION 3: EVENTS ─── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Events
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(v => !v)}
                style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', minHeight: 36 }}
              >
                {showAddForm ? 'Cancel' : '+ Add event'}
              </button>
            )}
          </div>

          {/* Admin add event form */}
          {isAdmin && showAddForm && (
            <div style={{ ...cardStyle, padding: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'rgba(108,99,255,0.3)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#A09AF8' }}>New event</h3>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Event title *"
                style={{ width: '100%' }}
              />
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{ width: '100%' }}
              />
              <input
                type="text"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                placeholder="Time (e.g. 7:00 PM) — optional"
                style={{ width: '100%' }}
              />
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Location — optional"
                style={{ width: '100%' }}
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description — optional"
                rows={3}
                style={{ width: '100%', resize: 'none' }}
              />
              {addError && (
                <p style={{ fontSize: 13, color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 10, padding: '8px 12px' }}>{addError}</p>
              )}
              <button
                onClick={addEvent}
                disabled={saving || !newTitle.trim() || !newDate}
                style={{
                  width: '100%',
                  minHeight: 48,
                  backgroundColor: '#6C63FF',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: 12,
                  border: 'none',
                  cursor: saving || !newTitle.trim() || !newDate ? 'not-allowed' : 'pointer',
                  opacity: saving || !newTitle.trim() || !newDate ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save event'}
              </button>
            </div>
          )}

          {futureEvents.length === 0 && !showAddForm ? (
            <div style={{ ...cardStyle, padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                {isAdmin ? 'No upcoming events. Add one above.' : 'No upcoming events yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {futureEvents.map(event => {
                const [, em, ed] = event.event_date.split('-').map(Number)
                const days = daysUntilDate(event.event_date, today)
                const summary = rsvpSummary(event)
                return (
                  <div key={event.id} style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{event.title}</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                          {MONTH_SHORT[em - 1]} {ed}
                          {event.event_time && ` · ${event.event_time}`}
                        </p>
                        {event.location && (
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>📍 {event.location}</p>
                        )}
                        {event.description && (
                          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 1.5 }}>{event.description}</p>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ fontSize: 12, color: '#6C63FF', fontWeight: 600 }}>
                          {days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}
                        </span>
                      </div>
                    </div>

                    {summary && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{summary}</p>
                    )}

                    <RsvpButtons event={event} onRsvp={toggleRsvp} />

                    {isAdmin && (
                      <button
                        onClick={() => deleteEvent(event.id)}
                        style={{ fontSize: 12, color: 'rgba(255,77,77,0.6)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginTop: 4 }}
                      >
                        Remove event
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
