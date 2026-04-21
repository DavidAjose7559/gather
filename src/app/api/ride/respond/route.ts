import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'

export async function POST(request: NextRequest) {
  const { match_id, role, rsvp_id, response } = await request.json()

  if (!match_id || !role || !response) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['accept', 'decline'].includes(response)) {
    return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
  }
  if (!['driver', 'rider'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const newStatus = response === 'accept' ? 'accepted' : 'declined'

  const { data: match } = await supabase
    .from('ride_matches')
    .select('id, event_id, driver_rsvp_id, status')
    .eq('id', match_id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (role === 'driver') {
    const { error } = await supabase
      .from('ride_matches')
      .update({ status: newStatus })
      .eq('id', match_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (response === 'accept') {
      // Email riders
      const { data: members } = await supabase
        .from('ride_match_members')
        .select('id, rsvp_id')
        .eq('match_id', match_id)

      if (members && members.length > 0) {
        const rsvpIds = members.map(m => m.rsvp_id)
        const { data: rsvpData } = await supabase.from('event_rsvps').select('id, user_id').in('id', rsvpIds)
        const userIds = (rsvpData ?? []).map(r => r.user_id)
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, display_name, email').in('id', userIds)
        const profileMap = new Map((profilesData ?? []).map(p => [p.id, p]))
        const rsvpMap = new Map((rsvpData ?? []).map(r => [r.id, r]))

        const { data: driverRsvpData } = await supabase.from('event_rsvps').select('user_id').eq('id', match.driver_rsvp_id).single()
        const driverProfile = driverRsvpData ? profileMap.get(driverRsvpData.user_id) : null
        const driverName = driverProfile?.display_name ?? driverProfile?.full_name ?? 'Your driver'

        const { data: eventData } = await supabase.from('events').select('title').eq('id', match.event_id).single()

        const emailBatch = members.map(m => {
          const rsvp = rsvpMap.get(m.rsvp_id)
          if (!rsvp) return null
          const p = profileMap.get(rsvp.user_id)
          if (!p?.email) return null
          const firstName = (p.display_name ?? p.full_name).split(' ')[0]
          const respondUrl = `${appUrl}/ride/${match_id}/rider/${m.rsvp_id}`
          return {
            from: fromEmail,
            to: p.email,
            subject: `[Gather] Your ride to ${eventData?.title ?? 'the event'} is confirmed`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
                <p style="font-size: 16px; margin-bottom: 16px;">Hi ${firstName},</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                  <strong>${driverName}</strong> has accepted to drive you to <strong>${eventData?.title ?? 'the event'}</strong>.
                  Please confirm or decline below.
                </p>
                <p style="margin-bottom: 24px;">
                  <a href="${respondUrl}"
                     style="display: inline-block; background: linear-gradient(to right, #4f46e5, #9333ea); color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
                    Confirm or decline →
                  </a>
                </p>
                <p style="font-size: 13px; color: #6b7280;">You're receiving this because you're part of the Gather group.</p>
              </div>
            `,
          }
        }).filter(Boolean) as Parameters<typeof resend.batch.send>[0]

        if (emailBatch.length > 0) {
          await resend.batch.send(emailBatch).catch(() => {})
        }

        // Mark members as notified
        await supabase
          .from('ride_match_members')
          .update({ notified_at: new Date().toISOString() })
          .eq('match_id', match_id)
      }
    } else {
      // Driver declined — notify admin
      const { data: admins } = await supabase.from('profiles').select('email, full_name, display_name').eq('role', 'admin')
      const { data: driverRsvp } = await supabase.from('event_rsvps').select('user_id').eq('id', match.driver_rsvp_id).single()
      const { data: driverProfile } = driverRsvp
        ? await supabase.from('profiles').select('full_name, display_name').eq('id', driverRsvp.user_id).single()
        : { data: null }
      const driverName = driverProfile?.display_name ?? driverProfile?.full_name ?? 'A driver'
      const { data: eventData } = await supabase.from('events').select('title').eq('id', match.event_id).single()

      const adminEmails = (admins ?? []).filter(a => !!a.email).map(a => ({
        from: fromEmail,
        to: a.email!,
        subject: `[Gather] Ride match declined for ${eventData?.title ?? 'an event'}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
            <p style="font-size: 16px; margin-bottom: 16px;">Hi ${(a.display_name ?? a.full_name).split(' ')[0]},</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              <strong>${driverName}</strong> has declined their ride match for <strong>${eventData?.title ?? 'the event'}</strong>.
              The riders in this match will need a new arrangement.
            </p>
            <p style="font-size: 13px; color: #6b7280;">You're receiving this as a Gather admin.</p>
          </div>
        `,
      }))

      if (adminEmails.length > 0) {
        await resend.batch.send(adminEmails).catch(() => {})
      }
    }
  } else {
    // Rider response
    if (!rsvp_id) return NextResponse.json({ error: 'Missing rsvp_id for rider' }, { status: 400 })

    const { error } = await supabase
      .from('ride_match_members')
      .update({ status: newStatus })
      .eq('match_id', match_id)
      .eq('rsvp_id', rsvp_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: newStatus })
}
