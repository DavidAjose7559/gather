import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { todayToronto } from '@/lib/date'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

function formatTime(createdAt: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(createdAt))
}

export async function GET() {
  const supabase = await createClient()
  const today = todayToronto()

  // Fetch today's check-ins with prayer_life = 'not_today' OR word_time = 'no'
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('user_id, prayer_life, word_time, created_at')
    .eq('check_in_date', today)
    .or('prayer_life.eq.not_today,word_time.eq.no')

  if (!checkIns || checkIns.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No matching check-ins today' })
  }

  // Fetch profiles for all matching check-ins + all admins in one go
  const memberIds = checkIns.map((c) => c.user_id)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, email, role')

  if (!allProfiles) return NextResponse.json({ sent: false, reason: 'Failed to fetch profiles' })

  const profileMap = Object.fromEntries(allProfiles.map((p) => [p.id, p]))
  const admins = allProfiles.filter((p) => p.role === 'admin' && p.email)

  if (admins.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No admin emails found' })
  }

  // Build lists
  const notPrayed = checkIns
    .filter((c) => c.prayer_life === 'not_today')
    .map((c) => {
      const p = profileMap[c.user_id]
      const name = p?.display_name ?? p?.full_name ?? 'Unknown'
      return `• ${name} (checked in at ${formatTime(c.created_at)})`
    })

  const notBibleStudy = checkIns
    .filter((c) => c.word_time === 'no')
    .map((c) => {
      const p = profileMap[c.user_id]
      const name = p?.display_name ?? p?.full_name ?? 'Unknown'
      return `• ${name} (checked in at ${formatTime(c.created_at)})`
    })

  function buildList(label: string, items: NonNullable<typeof notPrayed>): string {
    if (items.length === 0) return ''
    return `<p style="font-size:15px;font-weight:600;color:#111827;margin-bottom:8px;">${label}</p>
<p style="font-size:14px;color:#374151;line-height:1.8;margin-bottom:20px;">${items.join('<br>')}</p>`
  }

  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
      <p style="font-size:16px;margin-bottom:16px;">Hey {firstName},</p>
      <p style="font-size:16px;line-height:1.6;margin-bottom:20px;">
        Here's today's summary of members who haven't done prayer or bible study:
      </p>
      ${buildList("Hasn't prayed today:", notPrayed)}
      ${buildList("Hasn't done bible study:", notBibleStudy)}
      <p style="font-size:15px;color:#374151;margin-top:8px;">
        You might want to reach out and encourage them 🙏🏾
      </p>
      <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
        — <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">Gather</a> · gatherdaily.app
      </p>
    </div>
  `

  // Send one email per admin via Resend batch
  const emails = admins.map((admin) => {
    const firstName = (admin.display_name ?? admin.full_name).split(' ')[0]
    return {
      from: fromEmail,
      to: admin.email!,
      subject: 'Gather — daily prayer & bible study summary',
      html: body.replace('{firstName}', firstName),
    }
  })

  await resend.batch.send(emails)

  return NextResponse.json({ sent: true, adminCount: admins.length })
}
