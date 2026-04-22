import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EventDetail from './EventDetail'
import type {
  WorshipEvent,
  WorshipBudgetItem,
  WorshipOrderItem,
  WorshipGuest,
  WorshipNoteWithCreator,
  WorshipTaskWithAssignee,
  WorshipTeamMember,
} from '@/lib/types'

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_worship_team')
    .eq('id', user.id)
    .single()

  if (!profile?.is_worship_team && profile?.role !== 'admin') redirect('/')

  const [eventRes, budgetRes, orderRes, guestsRes, tasksRes, notesRes, teamRes] = await Promise.all([
    supabase.from('worship_events').select('*').eq('id', eventId).single(),
    supabase.from('worship_budget').select('*').eq('event_id', eventId).order('created_at'),
    supabase.from('worship_order_of_service').select('*').eq('event_id', eventId).order('position'),
    supabase.from('worship_guests').select('*').eq('event_id', eventId).order('name'),
    supabase.from('worship_tasks').select('*').eq('event_id', eventId).order('created_at'),
    supabase.from('worship_notes').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, display_name').eq('is_worship_team', true).order('full_name'),
  ])

  if (eventRes.error || !eventRes.data) notFound()

  // Enrich tasks with assignee names
  const rawTasks = tasksRes.data ?? []
  const assigneeIds = [...new Set(rawTasks.filter((t) => t.assigned_to).map((t) => t.assigned_to as string))]
  const assigneeMap: Record<string, string> = {}
  if (assigneeIds.length > 0) {
    const { data: assignees } = await supabase
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', assigneeIds)
    for (const a of assignees ?? []) {
      assigneeMap[a.id] = a.display_name ?? a.full_name
    }
  }
  const tasks: WorshipTaskWithAssignee[] = rawTasks.map((t) => ({
    ...t,
    assignee_name: t.assigned_to ? (assigneeMap[t.assigned_to] ?? null) : null,
  }))

  // Enrich notes with creator names
  const rawNotes = notesRes.data ?? []
  const creatorIds = [...new Set(rawNotes.map((n) => n.created_by))]
  const creatorMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', creatorIds)
    for (const c of creators ?? []) {
      creatorMap[c.id] = c.display_name ?? c.full_name
    }
  }
  const notes: WorshipNoteWithCreator[] = rawNotes.map((n) => ({
    ...n,
    creator_name: creatorMap[n.created_by] ?? 'Unknown',
  }))

  // Include admins in the team dropdown for task assignment
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, display_name')
    .eq('role', 'admin')
  const teamSet = new Map<string, WorshipTeamMember>()
  for (const m of [...(teamRes.data ?? []), ...(admins ?? [])]) {
    teamSet.set(m.id, m)
  }
  const team: WorshipTeamMember[] = Array.from(teamSet.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  )

  return (
    <EventDetail
      event={eventRes.data as WorshipEvent}
      budget={(budgetRes.data ?? []) as WorshipBudgetItem[]}
      order={(orderRes.data ?? []) as WorshipOrderItem[]}
      guests={(guestsRes.data ?? []) as WorshipGuest[]}
      tasks={tasks}
      notes={notes}
      team={team}
      currentUserId={user.id}
    />
  )
}
