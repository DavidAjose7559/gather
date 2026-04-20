import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { calculateStreak } from '@/lib/streaks'
import { todayToronto, formatDateToronto } from '@/lib/date'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

export async function GET() {
  const supabase = await createClient()

  const today = todayToronto()
  const sevenDaysAgoCursor = new Date()
  sevenDaysAgoCursor.setDate(sevenDaysAgoCursor.getDate() - 6)
  const sevenDaysAgoStr = formatDateToronto(sevenDaysAgoCursor)

  const ninetyDaysAgoCursor = new Date()
  ninetyDaysAgoCursor.setDate(ninetyDaysAgoCursor.getDate() - 90)
  const ninetyDaysAgoStr = formatDateToronto(ninetyDaysAgoCursor)

  const [profilesRes, weekCheckInsRes, recentCheckInsRes, adminsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, display_name'),
    supabase.from('check_ins').select('user_id, check_in_date').gte('check_in_date', sevenDaysAgoStr).lte('check_in_date', today),
    supabase.from('check_ins').select('user_id, check_in_date').gte('check_in_date', ninetyDaysAgoStr).order('check_in_date', { ascending: false }),
    supabase.from('profiles').select('full_name, display_name, email').eq('role', 'admin'),
  ])

  const profiles = profilesRes.data ?? []
  const weekCheckIns = weekCheckInsRes.data ?? []
  const recentCheckIns = recentCheckInsRes.data ?? []
  const admins = (adminsRes.data ?? []).filter(a => a.email)

  if (admins.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No admin emails' })
  }

  type MemberStat = { name: string; days: number; streak: number }
  const stats: MemberStat[] = profiles.map(profile => {
    const name = profile.display_name ?? profile.full_name
    const weekHistory = weekCheckIns.filter(c => c.user_id === profile.id)
    const days = new Set(weekHistory.map(c => c.check_in_date)).size
    const allHistory = recentCheckIns.filter(c => c.user_id === profile.id)
    const streak = calculateStreak(allHistory)
    return { name, days, streak }
  })

  stats.sort((a, b) => b.days - a.days || b.streak - a.streak)

  const rows = stats.map(s => {
    const icon = s.days >= 5 ? '✅' : '⭕'
    return `${icon} ${s.name} — ${s.days}/7 days`
  })

  const emails = admins.map(admin => {
    const firstName = (admin.display_name ?? admin.full_name).split(' ')[0]
    const listHtml = rows.map(r => `<p style="font-size:15px;color:#374151;margin:4px 0;">${r}</p>`).join('')

    return {
      from: fromEmail,
      to: admin.email!,
      subject: 'Gather \u2014 your week in review \uD83D\uDE4F\uD83C\uDFFE',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
          <p style="font-size:16px;margin-bottom:16px;">Hey ${firstName},</p>
          <p style="font-size:16px;line-height:1.6;margin-bottom:20px;">
            Here's how your Gather community did this week:
          </p>
          <div style="margin-bottom:24px;">
            ${listHtml}
          </div>
          <p style="font-size:15px;color:#374151;margin-bottom:4px;">Keep showing up for each other \uD83D\uDE4F\uD83C\uDFFE</p>
          <p style="font-size:15px;color:#374151;margin-bottom:24px;">
            <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">\u2192 gatherdaily.app</a>
          </p>
          <p style="font-size:14px;color:#374151;">\u2014 Gather</p>
          <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
            <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">gatherdaily.app</a>
          </p>
        </div>`,
    }
  })

  await resend.batch.send(emails)
  return NextResponse.json({ sent: true, adminCount: admins.length, memberCount: stats.length })
}
