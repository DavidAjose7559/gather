'use client'

import { useState } from 'react'
import type { WorshipTaskWithAssignee, WorshipTeamMember } from '@/lib/types'

type Status = 'todo' | 'in_progress' | 'done'
type FilterVal = 'all' | Status

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  todo: { bg: 'rgba(96,96,96,0.15)', text: '#909090', label: 'To do' },
  in_progress: { bg: 'rgba(108,99,255,0.15)', text: '#A09AF8', label: 'In progress' },
  done: { bg: 'rgba(76,175,80,0.15)', text: '#4CAF50', label: 'Done' },
}

const STATUS_CYCLE: Status[] = ['todo', 'in_progress', 'done']

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TasksTab({
  eventId,
  tasks: initialTasks,
  team,
  currentUserId,
  onTasksChange,
}: {
  eventId: string
  tasks: WorshipTaskWithAssignee[]
  team: WorshipTeamMember[]
  currentUserId: string
  onTasksChange: (t: WorshipTaskWithAssignee[]) => void
}) {
  const [tasks, setTasksState] = useState(initialTasks)
  const [filter, setFilter] = useState<FilterVal>('all')
  const [addingTask, setAddingTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', due_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function updateLocal(items: WorshipTaskWithAssignee[]) {
    setTasksState(items)
    onTasksChange(items)
  }

  async function cycleStatus(task: WorshipTaskWithAssignee) {
    const idx = STATUS_CYCLE.indexOf(task.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    updateLocal(tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)))
    setUpdatingId(task.id)
    await fetch(`/api/worship/tasks?id=${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setUpdatingId(null)
  }

  async function addTask() {
    if (!newTask.title.trim()) return
    setSaving(true)
    const res = await fetch('/api/worship/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        title: newTask.title.trim(),
        assigned_to: newTask.assigned_to || null,
        due_date: newTask.due_date || null,
        notes: newTask.notes.trim() || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      updateLocal([...tasks, created])
      setNewTask({ title: '', assigned_to: '', due_date: '', notes: '' })
      setAddingTask(false)
    }
    setSaving(false)
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/worship/tasks?id=${id}`, { method: 'DELETE' })
    if (res.ok) updateLocal(tasks.filter((t) => t.id !== id))
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length

  const displayed = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: active ? '#6C63FF' : 'var(--bg-input)',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {done} of {total} task{total !== 1 ? 's' : ''} completed
          </span>
          <span style={{ fontSize: 13, color: total > 0 ? '#4CAF50' : 'var(--text-tertiary)', fontWeight: 600 }}>
            {total > 0 ? `${Math.round((done / total) * 100)}%` : '—'}
          </span>
        </div>
        {total > 0 && (
          <div style={{ height: 6, backgroundColor: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((done / total) * 100)}%`, backgroundColor: '#4CAF50', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => (
          <button key={f} style={filterBtnStyle(filter === f)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : statusConfig[f].label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            {filter === 'all' ? 'No tasks yet.' : `No ${filter === 'in_progress' ? 'in-progress' : filter} tasks.`}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayed.map((task) => {
          const sc = statusConfig[task.status]
          const isDone = task.status === 'done'

          return (
            <div key={task.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Status toggle */}
              <button
                onClick={() => cycleStatus(task)}
                disabled={updatingId === task.id}
                title="Click to change status"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${isDone ? '#4CAF50' : 'var(--border-light)'}`,
                  backgroundColor: isDone ? '#4CAF50' : 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: '#fff',
                  opacity: updatingId === task.id ? 0.5 : 1,
                }}
              >
                {isDone ? '✓' : ''}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: isDone ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  marginBottom: 4,
                }}>
                  {task.title}
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, backgroundColor: sc.bg, color: sc.text }}>
                    {sc.label}
                  </span>
                  {task.assignee_name && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee_name}</span>
                  )}
                  {task.due_date && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Due {formatDate(task.due_date)}</span>
                  )}
                  {task.notes && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{task.notes}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                style={{ fontSize: 12, color: '#FF4D4D', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2 }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Add task form */}
      {addingTask ? (
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus
              style={inputStyle}
              value={newTask.title}
              onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
              placeholder="Task title"
              onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select
                style={inputStyle}
                value={newTask.assigned_to}
                onChange={(e) => setNewTask((t) => ({ ...t, assigned_to: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ?? m.full_name}{m.id === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </select>
              <input
                type="date"
                style={inputStyle}
                value={newTask.due_date}
                onChange={(e) => setNewTask((t) => ({ ...t, due_date: e.target.value }))}
              />
            </div>
            <input
              style={inputStyle}
              value={newTask.notes}
              onChange={(e) => setNewTask((t) => ({ ...t, notes: e.target.value }))}
              placeholder="Notes (optional)"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addTask} disabled={saving || !newTask.title.trim()} style={{ flex: 1, padding: '10px', borderRadius: 12, backgroundColor: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {saving ? '…' : 'Add task'}
              </button>
              <button onClick={() => { setAddingTask(false); setNewTask({ title: '', assigned_to: '', due_date: '', notes: '' }) }} style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingTask(true)}
          style={{ padding: '12px', borderRadius: 14, backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-light)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}
        >
          + Add task
        </button>
      )}
    </div>
  )
}
