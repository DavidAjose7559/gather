import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { todayToronto } from '@/lib/date'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

export async function GET() {
  const supabase = await createClient()
  const today = todayToronto()
  const [, monthStr, dayStr] = today.split('-')
  const month = parseInt(monthStr)
  const day = parseInt(dayStr)

  // Find birthdays matching today's month and day
  const { data: birthdays, error: bdError } = await supabase
    .from('birthdays')
    .select('name')
    .eq('month', month)
    .eq('day', day)

  if (bdError) return NextResponse.json({ error: bdError.message }, { status: 500 })
  if (!birthdays || birthdays.length === 0) {
    return NextResponse.json({ sent: 0, birthdays: [], date: today, note: 'No birthdays today' })
  }

  // Fetch all member emails
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('full_name, display_name, email')

  if (membersError || !members) {
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }

  const birthdayNames = birthdays.map((b) => b.name)
  const birthdayList = birthdayNames.length === 1
    ? birthdayNames[0]
    : birthdayNames.length === 2
    ? `${birthdayNames[0]} and ${birthdayNames[1]}`
    : `${birthdayNames.slice(0, -1).join(', ')}, and ${birthdayNames.at(-1)}`

  const subject = birthdayNames.length === 1
    ? `🎂 Today is ${birthdayNames[0]}'s birthday!`
    : `🎂 Today are some birthdays in Gather!`

  const emails = members.filter((m) => m.email)

  const sends = emails.map((member) => {
    const firstName = (member.display_name ?? member.full_name).split(' ')[0]
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hey ${firstName},</p>
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">Today is ${birthdayList}'s birthday! 🎂🎉</p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Take a moment to reach out and celebrate them today.
        </p>
        <a href="${appUrl}" style="display: inline-block; background: #6C63FF; color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          Open Gather &rarr;
        </a>
        <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">— The Gather community</p>
      </div>`

    return resend.emails.send({ from: fromEmail, to: member.email!, subject, html })
  })

  const results = await Promise.allSettled(sends)
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    sent: emails.length - failed,
    birthdays: birthdayNames,
    date: today,
  })
}
