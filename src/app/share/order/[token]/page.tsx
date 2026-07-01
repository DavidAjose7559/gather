import { createClient } from '@supabase/supabase-js'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type OrderItem = {
  position: number
  item: string
  duration_minutes: number | null
  assigned_to: string | null
  notes: string | null
}

type OrderData = {
  title: string
  event_date: string
  venue: string | null
  theme: string | null
  order_of_service: OrderItem[]
}

async function fetchOrder(token: string): Promise<OrderData | null> {
  const { data: event, error: eventErr } = await supabaseAdmin
    .from('worship_events')
    .select('id, title, event_date, venue, theme')
    .eq('share_token', token)
    .single()

  if (eventErr || !event) {
    return null
  }

  const { data: orderItems, error: orderErr } = await supabaseAdmin
    .from('worship_order_of_service')
    .select('position, item, duration_minutes, assigned_to, notes')
    .eq('event_id', event.id)
    .order('position')

  if (orderErr) {
    return null
  }

  return {
    title: event.title,
    event_date: event.event_date,
    venue: event.venue,
    theme: event.theme,
    order_of_service: orderItems ?? [],
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

function formatTime(minutes: number, startMinutes: number) {
  const totalMinutes = startMinutes + minutes
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
}

export default async function PublicOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await fetchOrder(token)

  if (!data) {
    return (
      <>
        <style>{`
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; }
          .card { text-align: center; padding: 40px; }
          .title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 8px; }
          .subtitle { font-size: 15px; color: #666; }
        `}</style>
        <div className="container">
          <div className="card">
            <p className="title">This link is no longer valid</p>
            <p className="subtitle">The Order of Service may have been updated or removed.</p>
          </div>
        </div>
      </>
    )
  }

  const totalDuration = data.order_of_service.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFFFFF; color: #1a1a1a; }
        .page { max-width: 600px; margin: 0 auto; padding: 32px 20px 48px; }
        .header { text-align: center; margin-bottom: 32px; }
        .event-title { font-size: 28px; font-weight: 700; color: #6C63FF; margin: 0 0 8px; line-height: 1.2; }
        .event-date { font-size: 16px; color: #333; margin: 0 0 4px; }
        .event-venue { font-size: 15px; color: #666; margin: 0; }
        .event-theme { font-size: 15px; color: #888; font-style: italic; margin: 12px 0 0; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 24px 0; }
        .order-list { display: flex; flex-direction: column; gap: 16px; }
        .order-item { display: flex; align-items: flex-start; gap: 16px; padding: 16px; background: #FAFAFA; border-radius: 12px; }
        .item-time { font-size: 14px; font-weight: 600; color: #6C63FF; min-width: 72px; flex-shrink: 0; }
        .item-content { flex: 1; min-width: 0; }
        .item-name { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 4px; }
        .item-meta { font-size: 14px; color: #666; margin: 0; }
        .item-notes { font-size: 13px; color: #888; margin: 8px 0 0; font-style: italic; }
        .item-duration { font-size: 13px; color: #999; text-align: right; min-width: 50px; flex-shrink: 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee; }
        .footer-brand { font-size: 14px; color: #888; margin: 0; }
        .footer-link { color: #6C63FF; text-decoration: none; }
        .print-btn { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #6C63FF; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .print-btn:hover { background: #5a52e0; }
        .summary { text-align: center; font-size: 14px; color: #666; margin-bottom: 24px; }
        @media print {
          .print-btn { display: none; }
          .page { padding: 20px; }
          .order-item { break-inside: avoid; }
          body { background: #fff; }
        }
        @media (max-width: 480px) {
          .order-item { flex-direction: column; gap: 8px; }
          .item-time { min-width: auto; }
          .item-duration { text-align: left; }
        }
      `}</style>
      <div className="page">
        <header className="header">
          <h1 className="event-title">{data.title}</h1>
          <p className="event-date">{formatDate(data.event_date)}</p>
          {data.venue && <p className="event-venue">{data.venue}</p>}
          {data.theme && <p className="event-theme">{data.theme}</p>}
        </header>

        <div className="divider" />

        {data.order_of_service.length > 0 && (
          <p className="summary">
            {data.order_of_service.length} items · {totalDuration} minutes
          </p>
        )}

        <div className="order-list">
          {data.order_of_service.map((item, idx) => {
            const cumulativeMinutes = data.order_of_service
              .slice(0, idx)
              .reduce((sum, i) => sum + (i.duration_minutes ?? 0), 0)
            return (
              <div key={idx} className="order-item">
                <span className="item-time">{formatTime(cumulativeMinutes, 0)}</span>
                <div className="item-content">
                  <p className="item-name">{item.item}</p>
                  {item.assigned_to && <p className="item-meta">{item.assigned_to}</p>}
                  {item.notes && <p className="item-notes">{item.notes}</p>}
                </div>
                {item.duration_minutes && (
                  <span className="item-duration">{item.duration_minutes} min</span>
                )}
              </div>
            )
          })}
        </div>

        {data.order_of_service.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
            No items in the order of service yet.
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
