import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ResponseForm from './ResponseForm'

const spiritualLabels = { strong: '🔥 Strong', okay: '🙂 Okay', struggling: '😔 Struggling' }
const wordTimeLabels = { yes: '📖 Yes', a_little: '✏️ A little', no: '😬 Not today' }
const prayerLabels = { strong: '🙏 Strong', somewhat: '🤲 Somewhat', weak: '😶 Weak' }
const emotionalLabels = {
  peaceful: '😌 Peaceful',
  okay: '🙂 Okay',
  anxious: '😰 Anxious',
  overwhelmed: '😩 Overwhelmed',
  low: '😞 Low',
  joyful: '😄 Joyful',
}
const physicalLabels = {
  good: '💪 Good',
  tired: '😴 Tired',
  low_energy: '🪫 Low energy',
  sick: '🤒 Sick',
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium">
      {label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default async function CheckInDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: checkIn } = await supabase
    .from('check_ins')
    .select('*')
    .eq('id', id)
    .single()

  if (!checkIn) notFound()

  // Visibility check
  let canView = false
  if (checkIn.user_id === user.id) {
    canView = true
  } else if (checkIn.visibility_type === 'everyone') {
    canView = true
  } else {
    const { data: grant } = await supabase
      .from('visibility_grants')
      .select('id')
      .eq('check_in_id', id)
      .eq('granted_to', user.id)
      .single()
    canView = !!grant
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">This check-in is private</h2>
          <p className="text-gray-500 text-sm">Only certain people can see it.</p>
          <Link href="/" className="mt-5 inline-block text-indigo-600 font-medium text-sm hover:text-indigo-700">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const [profileRes, responsesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', checkIn.user_id).single(),
    supabase
      .from('responses')
      .select('*')
      .eq('check_in_id', id)
      .order('created_at', { ascending: true }),
  ])

  const profile = profileRes.data
  const rawResponses = responsesRes.data ?? []

  // Load responder profiles for non-anonymous responses
  const responderIds = [...new Set(
    rawResponses.filter((r) => !r.is_anonymous).map((r) => r.responder_id)
  )]
  const { data: responderProfiles } = responderIds.length
    ? await supabase.from('profiles').select('id, full_name, display_name').in('id', responderIds)
    : { data: [] }

  const responderMap = Object.fromEntries(
    (responderProfiles ?? []).map((p) => [p.id, p.display_name ?? p.full_name])
  )

  const responses = rawResponses.map((r) => ({
    ...r,
    responderName: r.is_anonymous ? null : (responderMap[r.responder_id] ?? 'A member'),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 min-h-[44px] flex items-center text-sm">
            ← Home
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.display_name ?? profile?.full_name ?? 'Member'}
            {checkIn.user_id === user.id && (
              <span className="ml-2 text-base font-normal text-gray-400">(you)</span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(checkIn.check_in_date)}</p>
        </div>

        {/* Support banner */}
        {checkIn.support_requested && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-lg">🙏</span>
            <p className="text-sm font-medium text-amber-800">
              {checkIn.user_id === user.id
                ? 'You asked for support today.'
                : `${profile?.display_name ?? profile?.full_name} asked for support.`}
            </p>
          </div>
        )}

        {/* Check-in chips */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          {checkIn.spiritual_life && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Spiritual life</p>
              <Chip label={spiritualLabels[checkIn.spiritual_life as keyof typeof spiritualLabels]} />
            </div>
          )}
          {checkIn.word_time && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Time in the Word</p>
              <Chip label={wordTimeLabels[checkIn.word_time as keyof typeof wordTimeLabels]} />
            </div>
          )}
          {checkIn.prayer_life && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prayer life</p>
              <Chip label={prayerLabels[checkIn.prayer_life as keyof typeof prayerLabels]} />
            </div>
          )}
          {checkIn.emotional_state && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Emotionally</p>
              <Chip label={emotionalLabels[checkIn.emotional_state as keyof typeof emotionalLabels]} />
            </div>
          )}
          {checkIn.physical_state && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Physically</p>
              <Chip label={physicalLabels[checkIn.physical_state as keyof typeof physicalLabels]} />
            </div>
          )}
        </div>

        {/* Text sections */}
        {checkIn.struggles && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Struggles</p>
            <p className="text-gray-900 text-sm leading-relaxed">{checkIn.struggles}</p>
          </div>
        )}
        {checkIn.gratitude && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Grateful for</p>
            <p className="text-gray-900 text-sm leading-relaxed">{checkIn.gratitude}</p>
          </div>
        )}
        {checkIn.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-gray-900 text-sm leading-relaxed">{checkIn.notes}</p>
          </div>
        )}

        {/* Responses */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Responses {responses.length > 0 && `(${responses.length})`}
          </h2>
          {responses.length === 0 && (
            <p className="text-sm text-gray-400 px-1">No responses yet. Be the first to encourage.</p>
          )}
          <div className="flex flex-col gap-3">
            {responses.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-400 mb-1.5">
                  {r.responderName ?? 'A member of your group'}
                </p>
                <p className="text-gray-900 text-sm leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Response form */}
        <ResponseForm checkInId={id} currentUserId={user.id} />
      </div>
    </div>
  )
}
