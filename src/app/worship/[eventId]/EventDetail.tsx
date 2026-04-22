'use client'

import { useState } from 'react'
import type {
  WorshipEvent,
  WorshipBudgetItem,
  WorshipOrderItem,
  WorshipGuest,
  WorshipNoteWithCreator,
  WorshipTaskWithAssignee,
  WorshipTeamMember,
} from '@/lib/types'
import OverviewTab from './OverviewTab'
import BudgetTab from './BudgetTab'
import OrderTab from './OrderTab'
import GuestsTab from './GuestsTab'
import TasksTab from './TasksTab'

type Tab = 'overview' | 'budget' | 'order' | 'guests' | 'tasks'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'order', label: 'Order' },
  { id: 'guests', label: 'Guests' },
  { id: 'tasks', label: 'Tasks' },
]

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  planning: { bg: 'rgba(255,149,0,0.15)', text: '#FF9500', label: 'Planning' },
  confirmed: { bg: 'rgba(76,175,80,0.15)', text: '#4CAF50', label: 'Confirmed' },
  done: { bg: 'rgba(96,96,96,0.2)', text: '#909090', label: 'Done' },
}

export default function EventDetail({
  event: initialEvent,
  budget: initialBudget,
  order: initialOrder,
  guests: initialGuests,
  tasks: initialTasks,
  notes: initialNotes,
  team,
  currentUserId,
}: {
  event: WorshipEvent
  budget: WorshipBudgetItem[]
  order: WorshipOrderItem[]
  guests: WorshipGuest[]
  tasks: WorshipTaskWithAssignee[]
  notes: WorshipNoteWithCreator[]
  team: WorshipTeamMember[]
  currentUserId: string
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [event, setEvent] = useState(initialEvent)
  const [budget, setBudget] = useState(initialBudget)
  const [order, setOrder] = useState(initialOrder)
  const [guests, setGuests] = useState(initialGuests)
  const [tasks, setTasks] = useState(initialTasks)
  const [notes, setNotes] = useState(initialNotes)

  const sc = statusColors[event.status]

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '24px 20px 64px' }}>
      {/* Event header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {event.title}
          </h1>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
            backgroundColor: sc.bg,
            color: sc.text,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginTop: 4,
          }}>
            {sc.label}
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          {formatDate(event.event_date)}
          {event.venue ? ` · ${event.venue}` : ''}
          {event.expected_guests != null ? ` · ${event.expected_guests} expected` : ''}
        </p>
        {event.theme && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
            {event.theme}
          </p>
        )}
      </div>

      {/* Tab nav */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        backgroundColor: 'var(--bg-card)',
        borderRadius: 14,
        padding: 4,
        border: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              backgroundColor: activeTab === tab.id ? '#6C63FF' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          event={event}
          notes={notes}
          team={team}
          onEventUpdate={setEvent}
          onNoteAdd={(note) => setNotes((prev) => [note, ...prev])}
          onNoteDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        />
      )}
      {activeTab === 'budget' && (
        <BudgetTab
          eventId={event.id}
          budget={budget}
          team={team}
          onBudgetChange={setBudget}
        />
      )}
      {activeTab === 'order' && (
        <OrderTab
          eventId={event.id}
          order={order}
          onOrderChange={setOrder}
        />
      )}
      {activeTab === 'guests' && (
        <GuestsTab
          eventId={event.id}
          guests={guests}
          onGuestsChange={setGuests}
        />
      )}
      {activeTab === 'tasks' && (
        <TasksTab
          eventId={event.id}
          tasks={tasks}
          team={team}
          currentUserId={currentUserId}
          onTasksChange={setTasks}
        />
      )}
    </div>
  )
}
