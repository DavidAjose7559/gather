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
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 10, backgroundColor: 'rgba(108,99,255,0.15)', color: '#A09AF8', fontSize: 13, fontWeight: 500 }}>
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
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ width: '100%', maxWidth: 448, backgroundColor: '#1A1A1A', borderRadius: 24, border: '1px solid #2A2A2A', padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔒</p>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 8 }}>This check-in is private</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Only certain people can see it.</p>
          <Link href="/" style={{ marginTop: 20, display: 'inline-block', color: '#6C63FF', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
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

  const cardStyle = {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    border: '1px solid #2A2A2A',
    padding: 20,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 16,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            ← Home
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
            {profile?.display_name ?? profile?.full_name ?? 'Member'}
            {checkIn.user_id === user.id && (
              <span style={{ marginLeft: 8, fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>(you)</span>
            )}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 }}>{formatDate(checkIn.check_in_date)}</p>
        </div>

        {/* Support banner */}
        {checkIn.support_requested && (
          <div style={{ backgroundColor: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>🙏</span>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#FF9500' }}>
              {checkIn.user_id === user.id
                ? 'You asked for support today.'
                : `${profile?.display_name ?? profile?.full_name} asked for support.`}
            </p>
          </div>
        )}

        {/* Check-in chips */}
        <div style={cardStyle}>
          {checkIn.spiritual_life && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Spiritual life</p>
              <Chip label={spiritualLabels[checkIn.spiritual_life as keyof typeof spiritualLabels]} />
            </div>
          )}
          {checkIn.word_time && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Time in the Word</p>
              <Chip label={wordTimeLabels[checkIn.word_time as keyof typeof wordTimeLabels]} />
            </div>
          )}
          {checkIn.prayer_life && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Prayer life</p>
              <Chip label={prayerLabels[checkIn.prayer_life as keyof typeof prayerLabels]} />
            </div>
          )}
          {checkIn.emotional_state && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Emotionally</p>
              <Chip label={emotionalLabels[checkIn.emotional_state as keyof typeof emotionalLabels]} />
            </div>
          )}
          {checkIn.physical_state && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Physically</p>
              <Chip label={physicalLabels[checkIn.physical_state as keyof typeof physicalLabels]} />
            </div>
          )}
        </div>

        {/* Text sections */}
        {checkIn.struggles && (
          <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Struggles</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>{checkIn.struggles}</p>
          </div>
        )}
        {checkIn.gratitude && (
          <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Grateful for</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>{checkIn.gratitude}</p>
          </div>
        )}
        {checkIn.notes && (
          <div style={{ backgroundColor: '#1A1A1A', borderRadius: 20, border: '1px solid #2A2A2A', padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>{checkIn.notes}</p>
          </div>
        )}

        {/* Responses */}
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Responses {responses.length > 0 && `(${responses.length})`}
          </h2>
          {responses.length === 0 && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', paddingLeft: 4 }}>No responses yet. Be the first to encourage.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {responses.map((r) => (
              <div key={r.id} style={{ backgroundColor: '#1A1A1A', borderRadius: 16, border: '1px solid #2A2A2A', padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                  {r.responderName ?? 'A member of your group'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6 }}>{r.body}</p>
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
