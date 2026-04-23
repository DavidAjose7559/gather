export type Profile = {
  id: string
  full_name: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  role: 'member' | 'admin'
  reminder_enabled: boolean
  default_visibility: 'everyone' | 'specific' | 'one_person'
  created_at: string
  is_demo?: boolean | null
  is_worship_team?: boolean | null
  is_worship_only?: boolean | null
}

export type WorshipEvent = {
  id: string
  title: string
  event_date: string
  venue: string | null
  expected_guests: number | null
  theme: string | null
  notes: string | null
  status: 'planning' | 'confirmed' | 'done'
  money_in_bank: number | null
  created_by: string
  created_at: string
}

export type WorshipBudgetItem = {
  id: string
  event_id: string
  category: string
  allocated: number
  spent: number
  notes: string | null
  created_at: string
}

export type WorshipOrderItem = {
  id: string
  event_id: string
  position: number
  item: string
  duration_minutes: number | null
  assigned_to: string | null
  notes: string | null
}

export type WorshipGuest = {
  id: string
  event_id: string
  name: string
  category: 'speaker' | 'artist' | 'vip' | 'general' | null
  rsvp_status: 'invited' | 'confirmed' | 'declined'
  notes: string | null
}

export type WorshipTask = {
  id: string
  event_id: string
  title: string
  assigned_to: string | null
  due_date: string | null
  status: 'todo' | 'in_progress' | 'done'
  notes: string | null
  created_at: string
}

export type WorshipNote = {
  id: string
  event_id: string
  body: string
  created_by: string
  created_at: string
}

export type WorshipNoteWithCreator = WorshipNote & { creator_name: string }
export type WorshipTaskWithAssignee = WorshipTask & { assignee_name: string | null }
export type WorshipTeamMember = { id: string; full_name: string; display_name: string | null }

export type CheckIn = {
  id: string
  user_id: string
  check_in_date: string
  spiritual_life: 'strong' | 'okay' | 'struggling' | null
  word_time: 'yes' | 'a_little' | 'no' | null
  prayer_life: 'yes' | 'a_little' | 'not_today' | null
  emotional_state: 'peaceful' | 'okay' | 'anxious' | 'overwhelmed' | 'low' | 'joyful' | null
  physical_state: 'good' | 'tired' | 'sick' | 'low_energy' | null
  struggles: string | null
  gratitude: string | null
  notes: string | null
  support_requested: boolean
  visibility_type: 'everyone' | 'specific' | 'one_person'
  created_at: string
}

export type VisibilityGrant = {
  id: string
  check_in_id: string
  granted_to: string
}

export type Response = {
  id: string
  check_in_id: string
  responder_id: string
  body: string
  is_anonymous: boolean
  created_at: string
}

export type PrayerRequest = {
  id: string
  user_id: string
  body: string
  is_answered: boolean
  answered_note: string | null
  praying_count: number
  created_at: string
  answered_at: string | null
}

export type PrayerPraying = {
  id: string
  prayer_id: string
  user_id: string
}

export type PrayerComment = {
  id: string
  prayer_id: string
  user_id: string
  body: string
  created_at: string
}

export type SermonCurriculum = {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export type SermonSchedule = {
  id: string
  schedule_date: string
  curriculum_id: string | null
  episode_id: string | null
  episode_title: string
  episode_description: string | null
  episode_image_url: string | null
  episode_url: string | null
  source: 'spotify' | 'manual'
  youtube_url: string | null
  theme: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type SermonDiscussion = {
  id: string
  schedule_id: string
  user_id: string
  body: string
  created_at: string
}

export type Birthday = {
  id: string
  name: string
  month: number
  day: number
  created_at: string
}

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  location: string | null
  show_attendance: boolean
  created_by: string
  created_at: string
}

export type EventRsvp = {
  id: string
  event_id: string
  user_id: string
  status: 'going' | 'not_going' | 'maybe'
  ride_status: 'driving' | 'need_ride' | 'own_way' | 'unsure' | null
  area: string | null
  can_take: number | null
}

export type RideMatch = {
  id: string
  event_id: string
  driver_rsvp_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type RideMatchMember = {
  id: string
  match_id: string
  rsvp_id: string
  status: 'pending' | 'accepted' | 'declined'
  notified_at: string | null
  created_at: string
}

export type AttendeeInfo = {
  user_id: string
  rsvp_id: string
  name: string
  area: string | null
  ride_status: string | null
}

export type EventWithMeta = CalendarEvent & {
  rsvp_counts: { going: number; maybe: number; not_going: number }
  ride_summary: { driving: number; need_ride: number; own_way: number; unsure: number }
  my_rsvp: 'going' | 'maybe' | 'not_going' | null
  my_ride_status: 'driving' | 'need_ride' | 'own_way' | 'unsure' | null
  my_area: string | null
  my_can_take: number | null
  my_match: { id: string; status: 'pending' | 'accepted' | 'declined'; role: 'driver' | 'rider' } | null
  attendance: AttendeeInfo[] | null
}
