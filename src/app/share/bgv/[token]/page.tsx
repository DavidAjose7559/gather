import { createClient } from '@supabase/supabase-js'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Singer = {
  id: string
  name: string
  voice_part: 'Soprano' | 'Alto' | 'Tenor' | 'Bass'
}

type Minister = {
  id: string
  name: string
  position: number
  singers: Singer[]
}

type BGVData = {
  title: string
  event_date: string
  venue: string | null
  ministers: Minister[]
}

const voicePartColors: Record<string, string> = {
  Soprano: '#FF6B9D',
  Alto: '#FF9500',
  Tenor: '#4CAF50',
  Bass: '#6C63FF',
}

async function fetchBGV(token: string): Promise<BGVData | null> {
  const { data: event, error: eventErr } = await supabaseAdmin
    .from('worship_events')
    .select('id, title, event_date, venue')
    .eq('bgv_share_token', token)
    .single()

  if (eventErr || !event) {
    return null
  }

  const { data: ministers, error: minErr } = await supabaseAdmin
    .from('worship_bgv_ministers')
    .select('id, name, position')
    .eq('event_id', event.id)
    .order('position')

  if (minErr) {
    return null
  }

  const ministerIds = (ministers ?? []).map((m) => m.id)
  let singersMap: Record<string, Singer[]> = {}

  if (ministerIds.length > 0) {
    const { data: singers, error: singErr } = await supabaseAdmin
      .from('worship_bgv_singers')
      .select('id, minister_id, name, voice_part')
      .in('minister_id', ministerIds)

    if (singErr) {
      return null
    }

    for (const s of singers ?? []) {
      if (!singersMap[s.minister_id]) singersMap[s.minister_id] = []
      singersMap[s.minister_id].push({ id: s.id, name: s.name, voice_part: s.voice_part })
    }
  }

  return {
    title: event.title,
    event_date: event.event_date,
    venue: event.venue,
    ministers: (ministers ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      position: m.position,
      singers: singersMap[m.id] ?? [],
    })),
  }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function groupByVoicePart(singers: Singer[]) {
  const groups: Record<string, Singer[]> = {}
  for (const s of singers) {
    if (!groups[s.voice_part]) groups[s.voice_part] = []
    groups[s.voice_part].push(s)
  }
  return groups
}

export default async function PublicBGVPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await fetchBGV(token)

  if (!data) {
    return (
      <>
        <style>{`
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0A; }
          .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { text-align: center; padding: 40px; }
          .title { font-size: 20px; font-weight: 600; color: #FFFFFF; margin-bottom: 8px; }
          .subtitle { font-size: 15px; color: #888888; }
        `}</style>
        <div className="container">
          <div className="card">
            <p className="title">This link is no longer valid</p>
            <p className="subtitle">The BGV sheet may have been updated or removed.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0A; color: #FFFFFF; }
        .page { max-width: 600px; margin: 0 auto; padding: 32px 20px 48px; }
        .header { text-align: center; margin-bottom: 32px; }
        .event-title { font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 8px; line-height: 1.2; }
        .event-date { font-size: 16px; color: #888888; margin: 0 0 4px; }
        .event-venue { font-size: 15px; color: #888888; margin: 0; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent); margin: 24px 0; }
        .ministers-list { display: flex; flex-direction: column; gap: 16px; }
        .minister-card { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; }
        .minister-name { font-size: 18px; font-weight: 700; color: #6C63FF; margin: 0 0 12px; }
        .voice-group { margin-bottom: 12px; }
        .voice-group:last-child { margin-bottom: 0; }
        .voice-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .singers-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .singer-pill { padding: 6px 12px; border-radius: 16px; font-size: 14px; font-weight: 500; color: #FFFFFF; }
        .empty-state { text-align: center; color: #666666; padding: 40px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); }
        .footer-brand { font-size: 14px; color: #444444; margin: 0; }
        .footer-link { color: #6C63FF; text-decoration: none; }
        .print-btn { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #1A1A1A; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .print-btn:hover { background: #2A2A2A; }
        @media print {
          .print-btn { display: none; }
          .page { padding: 20px; }
          body { background: #fff; color: #000; }
          .event-title { color: #000; }
          .event-date, .event-venue { color: #333; }
          .minister-card { background: #f5f5f5; border-color: #ddd; }
          .minister-name { color: #6C63FF; }
          .singer-pill { color: #000 !important; }
          .divider { background: linear-gradient(to right, transparent, #ddd, transparent); }
          .footer { border-color: #ddd; }
          .footer-brand { color: #666; }
        }
      `}</style>
      <div className="page">
        <header className="header">
          <h1 className="event-title">{data.title}</h1>
          <p className="event-date">{formatDate(data.event_date)}</p>
          {data.venue && <p className="event-venue">{data.venue}</p>}
        </header>

        <div className="divider" />

        <div className="ministers-list">
          {data.ministers.map((minister) => {
            const grouped = groupByVoicePart(minister.singers)
            const voiceParts = ['Soprano', 'Alto', 'Tenor', 'Bass'].filter((vp) => grouped[vp]?.length > 0)

            return (
              <div key={minister.id} className="minister-card">
                <h2 className="minister-name">{minister.name}</h2>
                {voiceParts.length === 0 && (
                  <p style={{ fontSize: 14, color: '#666666', fontStyle: 'italic' }}>No singers assigned</p>
                )}
                {voiceParts.map((vp) => (
                  <div key={vp} className="voice-group">
                    <p className="voice-label" style={{ color: voicePartColors[vp] }}>{vp}</p>
                    <div className="singers-row">
                      {grouped[vp].map((singer) => (
                        <span
                          key={singer.id}
                          className="singer-pill"
                          style={{ backgroundColor: voicePartColors[vp] + '33' }}
                        >
                          {singer.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {data.ministers.length === 0 && (
          <p className="empty-state">
            No ministers assigned yet.
          </p>
        )}

        <footer className="footer">
          <p className="footer-brand">
            Time with Jesus · <a href="https://gatherdaily.app" className="footer-link">gatherdaily.app</a>
          </p>
          <PrintButton />
        </footer>
      </div>
    </>
  )
}
