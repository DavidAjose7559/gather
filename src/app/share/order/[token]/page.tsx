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
  time_slot: string | null
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
    .select('position, item, time_slot, duration_minutes, assigned_to, notes')
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
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0A; }
          .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { text-align: center; padding: 40px; }
          .title { font-size: 20px; font-weight: 600; color: #FFFFFF; margin-bottom: 8px; }
          .subtitle { font-size: 15px; color: #888888; }
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
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0A; color: #FFFFFF; }
        .page { max-width: 600px; margin: 0 auto; padding: 32px 20px 48px; }
        .header { text-align: center; margin-bottom: 32px; }
        .event-title { font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 8px; line-height: 1.2; }
        .event-date { font-size: 16px; color: #888888; margin: 0 0 4px; }
        .event-venue { font-size: 15px; color: #888888; margin: 0; }
        .event-theme { font-size: 15px; color: #6C63FF; font-style: italic; margin: 12px 0 0; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent); margin: 24px 0; }
        .order-list { display: flex; flex-direction: column; gap: 12px; }
        .order-item { display: flex; align-items: flex-start; gap: 16px; padding: 16px; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
        .item-time { font-size: 14px; font-weight: 600; color: #6C63FF; min-width: 72px; flex-shrink: 0; }
        .item-content { flex: 1; min-width: 0; }
        .item-name { font-size: 16px; font-weight: 600; color: #FFFFFF; margin: 0 0 4px; }
        .item-meta { font-size: 14px; color: #888888; margin: 0; }
        .item-notes { font-size: 13px; color: #666666; margin: 8px 0 0; font-style: italic; }
        .item-duration { font-size: 13px; color: #666666; text-align: right; min-width: 50px; flex-shrink: 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); }
        .footer-brand { font-size: 14px; color: #444444; margin: 0; }
        .footer-link { color: #6C63FF; text-decoration: none; }
        .print-btn { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #1A1A1A; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .print-btn:hover { background: #2A2A2A; }
        .summary { text-align: center; font-size: 14px; color: #888888; margin-bottom: 24px; }
        .empty-state { text-align: center; color: #666666; padding: 40px 0; }
        @media print {
          .print-btn { display: none; }
          .page { padding: 20px; }
          .order-item { break-inside: avoid; }
          body { background: #fff; color: #000; }
          .event-title, .item-name { color: #000; }
          .event-date, .event-venue, .item-meta, .summary { color: #333; }
          .order-item { background: #f5f5f5; border-color: #ddd; }
          .item-time { color: #6C63FF; }
          .divider { background: linear-gradient(to right, transparent, #ddd, transparent); }
          .footer { border-color: #ddd; }
          .footer-brand { color: #666; }
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
          {data.order_of_service.map((item, idx) => (
            <div key={idx} className="order-item">
              {item.time_slot && (
                <span className="item-time">{item.time_slot}</span>
              )}
              <div className="item-content">
                <p className="item-name">{item.item}</p>
                {item.assigned_to && <p className="item-meta">{item.assigned_to}</p>}
                {item.notes && <p className="item-notes">{item.notes}</p>}
              </div>
              {item.duration_minutes && (
                <span className="item-duration">{item.duration_minutes} min</span>
              )}
            </div>
          ))}
        </div>

        {data.order_of_service.length === 0 && (
          <p className="empty-state">
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
