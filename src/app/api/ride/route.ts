import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const eventId = request.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  const { data: matches } = await supabase
    .from('ride_matches')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')

  if (!matches || matches.length === 0) return NextResponse.json({ matches: [] })

  const matchIds = matches.map(m => m.id)
  const driverRsvpIds = matches.map(m => m.driver_rsvp_id)

  const [membersRes, driverRsvpsRes] = await Promise.all([
    supabase.from('ride_match_members').select('*').in('match_id', matchIds),
    supabase.from('event_rsvps').select('id, user_id, area').in('id', driverRsvpIds),
  ])

  const members = membersRes.data ?? []
  const driverRsvps = driverRsvpsRes.data ?? []
  const riderRsvpIds = members.map(m => m.rsvp_id)
  const allRsvpIds = [...new Set([...driverRsvpIds, ...riderRsvpIds])]

  const { data: rsvpData } = await supabase.from('event_rsvps').select('id, user_id, area').in('id', allRsvpIds)
  const allRsvps = rsvpData ?? []
  const allUserIds = [...new Set(allRsvps.map(r => r.user_id))]

  const { data: profilesData } = await supabase.from('profiles').select('id, full_name, display_name, email').in('id', allUserIds)
  const profileMap = new Map((profilesData ?? []).map(p => [p.id, p]))
  const rsvpMap = new Map(allRsvps.map(r => [r.id, r]))

  const enriched = matches.map(match => {
    const driverRsvp = rsvpMap.get(match.driver_rsvp_id)
    const driverProfile = driverRsvp ? profileMap.get(driverRsvp.user_id) : null
    const matchMembers = members.filter(m => m.match_id === match.id).map(m => {
      const rsvp = rsvpMap.get(m.rsvp_id)
      const p = rsvp ? profileMap.get(rsvp.user_id) : null
      return { ...m, name: p?.display_name ?? p?.full_name ?? 'Unknown', area: rsvp?.area ?? null }
    })
    return {
      ...match,
      driver_name: driverProfile?.display_name ?? driverProfile?.full_name ?? 'Unknown',
      driver_area: driverRsvp?.area ?? null,
      members: matchMembers,
    }
  })

  return NextResponse.json({ matches: enriched })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase.from('profiles').select('role, full_name, display_name').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { event_id, driver_rsvp_id, rider_rsvp_ids } = await request.json()
  if (!event_id || !driver_rsvp_id || !Array.isArray(rider_rsvp_ids) || rider_rsvp_ids.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: match, error: matchError } = await supabase
    .from('ride_matches')
    .insert({ event_id, driver_rsvp_id, status: 'pending' })
    .select()
    .single()

  if (matchError || !match) return NextResponse.json({ error: matchError?.message ?? 'Failed to create match' }, { status: 500 })

  const memberRows = rider_rsvp_ids.map((rsvpId: string) => ({
    match_id: match.id,
    rsvp_id: rsvpId,
    status: 'pending',
  }))

  const { error: membersError } = await supabase.from('ride_match_members').insert(memberRows)
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  // Send email to driver
  const allRsvpIds = [driver_rsvp_id, ...rider_rsvp_ids]
  const { data: rsvpData } = await supabase.from('event_rsvps').select('id, user_id, area').in('id', allRsvpIds)
  const rsvps = rsvpData ?? []
  const userIds = [...new Set(rsvps.map(r => r.user_id))]
  const { data: profilesData } = await supabase.from('profiles').select('id, full_name, display_name, email').in('id', userIds)
  const profileMap = new Map((profilesData ?? []).map(p => [p.id, p]))

  const driverRsvp = rsvps.find(r => r.id === driver_rsvp_id)
  const driverProfile = driverRsvp ? profileMap.get(driverRsvp.user_id) : null

  const riderNames = rider_rsvp_ids
    .map((id: string) => {
      const rsvp = rsvps.find(r => r.id === id)
      if (!rsvp) return null
      const p = profileMap.get(rsvp.user_id)
      return p?.display_name ?? p?.full_name ?? 'Someone'
    })
    .filter(Boolean)

  const { data: eventData } = await supabase.from('events').select('title, event_date').eq('id', event_id).single()

  if (driverProfile?.email) {
    const driverFirstName = (driverProfile.display_name ?? driverProfile.full_name).split(' ')[0]
    const acceptUrl = `${appUrl}/ride/${match.id}/driver`

    await resend.emails.send({
      from: fromEmail,
      to: driverProfile.email,
      subject: `[Gather] You've been matched as a driver for ${eventData?.title ?? 'an event'}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${driverFirstName},</p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            You've been matched as a driver for <strong>${eventData?.title ?? 'the upcoming event'}</strong>.
            The following ${riderNames.length === 1 ? 'person is' : 'people are'} hoping to ride with you:
          </p>
          <ul style="margin-bottom: 20px; padding-left: 20px;">
            ${riderNames.map((n: string) => `<li style="font-size: 15px; margin-bottom: 6px;">${n}</li>`).join('')}
          </ul>
          <p style="font-size: 15px; margin-bottom: 24px;">Please accept or decline below so they can be notified.</p>
          <p style="margin-bottom: 24px;">
            <a href="${acceptUrl}"
               style="display: inline-block; background: linear-gradient(to right, #4f46e5, #9333ea); color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
              Accept or decline →
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">You're receiving this because you're part of the Gather group.</p>
        </div>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ match })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('ride_matches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
