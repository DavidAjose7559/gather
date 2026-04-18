import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ResponseForm from './ResponseForm'

const spiritualLabels = { strong: 'Strong', okay: 'Okay', struggling: 'Struggling' }
const wordTimeLabels = { yes: 'In the Word', a_little: 'A little', no: 'Not today' }
const prayerLabels = { strong: 'Strong', somewhat: 'Somewhat', weak: 'Weak' }
const emotionalLabels = {
  peaceful: 'Peaceful', okay: 'Okay', anxious: 'Anxious',
  overwhelmed: 'Overwhelmed', low: 'Feeling low', joyful: 'Joyful',
}
const physicalLabels = { good: 'Good', tired: 'Tired', low_energy: 'Low energy', sick: 'Sick' }

type ChipColor = 'indigo' | 'amber' | 'green' | 'gray'

function Chip({ label, color = 'gray' }: { label: string; color?: ChipColor }) {
  const styles: Record<ChipColor, { bg: string; color: string }> = {
    indigo: { bg: '#EEF0FB', color: '#5B4FCF' },
    amber:  { bg: '#FEF3C7', color: '#92400E' },
    green:  { bg: '#DCFCE7', color: '#166534' },
    gray:   { bg: '#F5F3EF', color: '#6B6560' },
  }
  const s = styles[color]
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1"
      style={{ background: s.bg, color: s.color, fontSize: '13px', fontWeight: 500 }}
    >
      {label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function InitialsCircle({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold uppercase text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #5B4FCF, #7C3AED)' }}
    >
      {initials}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A8A29E', marginBottom: '8px' }}>
      {children}
    </p>
  )
}

export default async function CheckInDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: checkIn } = await supabase.from('check_ins').select('*').eq('id', id).single()
  if (!checkIn) notFound()

  let canView = false
  if (checkIn.user_id === user.id) {
    canView = true
  } else if (checkIn.visibility_type === 'everyone') {
    canView = true
  } else {
    const { data: grant } = await supabase
      .from('visibility_grants').select('id').eq('check_in_id', id).eq('granted_to', user.id).single()
    canView = !!grant
  }

  if (!canView) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#FAF9F7' }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1714', marginBottom: '8px' }}>This check-in is private</h2>
          <p style={{ fontSize: '14px', color: '#6B6560' }}>Only certain people can see it.</p>
          <Link href="/" style={{ display: 'inline-block', marginTop: '20px', fontSize: '14px', color: '#5B4FCF', fontWeight: 500 }}>
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const [profileRes, responsesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', checkIn.user_id).single(),
    supabase.from('responses').select('*').eq('check_in_id', id).order('created_at', { ascending: true }),
  ])

  const profile = profileRes.data
  const rawResponses = responsesRes.data ?? []

  const responderIds = [...new Set(rawResponses.filter((r) => !r.is_anonymous).map((r) => r.responder_id))]
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

  const displayName = profile?.display_name ?? profile?.full_name ?? 'Member'

  return (
    <div className="min-h-screen pb-12" style={{ background: '#FAF9F7' }}>
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Back link */}
        <Link href="/" style={{ fontSize: '14px', color: '#6B6560', fontWeight: 500 }} className="flex items-center gap-1 hover:opacity-70 w-fit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>

        {/* Header with avatar */}
        <div className="flex items-center gap-4">
          <InitialsCircle name={displayName} />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1714' }}>
              {displayName}
              {checkIn.user_id === user.id && (
                <span style={{ fontSize: '14px', fontWeight: 400, color: '#A8A29E', marginLeft: '6px' }}>(you)</span>
              )}
            </h1>
            <p style={{ fontSize: '13px', color: '#6B6560', marginTop: '2px' }}>{formatDate(checkIn.check_in_date)}</p>
          </div>
        </div>

        {/* Support banner */}
        {checkIn.support_requested && (
          <div
            className="px-4 py-3 rounded-2xl"
            style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderLeftWidth: '3px', borderLeftColor: '#F59E0B' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#92400E' }}>
              {checkIn.user_id === user.id
                ? 'You asked for support today.'
                : `${displayName} asked for support.`}
            </p>
          </div>
        )}

        {/* Check-in status chips */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
          {checkIn.spiritual_life && (
            <div>
              <SectionLabel>Spiritual life</SectionLabel>
              <Chip label={spiritualLabels[checkIn.spiritual_life as keyof typeof spiritualLabels]} color="indigo" />
            </div>
          )}
          {checkIn.word_time && (
            <div>
              <SectionLabel>Time in the Word</SectionLabel>
              <Chip label={wordTimeLabels[checkIn.word_time as keyof typeof wordTimeLabels]} color="indigo" />
            </div>
          )}
          {checkIn.prayer_life && (
            <div>
              <SectionLabel>Prayer life</SectionLabel>
              <Chip label={prayerLabels[checkIn.prayer_life as keyof typeof prayerLabels]} color="indigo" />
            </div>
          )}
          {checkIn.emotional_state && (
            <div>
              <SectionLabel>Emotionally</SectionLabel>
              <Chip label={emotionalLabels[checkIn.emotional_state as keyof typeof emotionalLabels]} color="amber" />
            </div>
          )}
          {checkIn.physical_state && (
            <div>
              <SectionLabel>Physically</SectionLabel>
              <Chip label={physicalLabels[checkIn.physical_state as keyof typeof physicalLabels]} color="green" />
            </div>
          )}
        </div>

        {/* Text sections */}
        {checkIn.struggles && (
          <div>
            <SectionLabel>Struggles</SectionLabel>
            <p style={{ fontSize: '15px', color: '#1A1714', lineHeight: 1.6 }}>{checkIn.struggles}</p>
          </div>
        )}
        {checkIn.gratitude && (
          <div>
            <SectionLabel>Grateful for</SectionLabel>
            <p style={{ fontSize: '15px', color: '#1A1714', lineHeight: 1.6 }}>{checkIn.gratitude}</p>
          </div>
        )}
        {checkIn.notes && (
          <div>
            <SectionLabel>Notes</SectionLabel>
            <p style={{ fontSize: '15px', color: '#1A1714', lineHeight: 1.6 }}>{checkIn.notes}</p>
          </div>
        )}

        {/* Responses */}
        <div>
          <SectionLabel>Responses {responses.length > 0 && `(${responses.length})`}</SectionLabel>
          {responses.length === 0 && (
            <p style={{ fontSize: '14px', color: '#A8A29E' }}>No responses yet. Be the first to encourage.</p>
          )}
          {responses.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8E4DE' }}>
              {responses.map((r, i) => {
                const name = r.responderName ?? 'Someone in your group'
                const initial = name[0].toUpperCase()
                return (
                  <div
                    key={r.id}
                    className="px-4 py-4 flex gap-3"
                    style={i > 0 ? { borderTop: '1px solid #EBEBEB' } : {}}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 uppercase"
                      style={{
                        background: r.is_anonymous ? '#F5F3EF' : '#EEF0FB',
                        color: r.is_anonymous ? '#A8A29E' : '#5B4FCF',
                      }}
                    >
                      {r.is_anonymous ? '?' : initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#6B6560', marginBottom: '4px' }}>
                        {name}
                      </p>
                      <p style={{ fontSize: '15px', color: '#1A1714', lineHeight: 1.6 }}>{r.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <ResponseForm checkInId={id} currentUserId={user.id} />
      </div>
    </div>
  )
}
