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
}

export type CheckIn = {
  id: string
  user_id: string
  check_in_date: string
  spiritual_life: 'strong' | 'okay' | 'struggling' | null
  word_time: 'yes' | 'a_little' | 'no' | null
  prayer_life: 'strong' | 'somewhat' | 'weak' | null
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
  created_by: string
  created_at: string
}

export type EventRsvp = {
  id: string
  event_id: string
  user_id: string
  status: 'going' | 'not_going' | 'maybe'
}

export type EventWithMeta = CalendarEvent & {
  rsvp_counts: { going: number; maybe: number; not_going: number }
  my_rsvp: 'going' | 'maybe' | 'not_going' | null
}
