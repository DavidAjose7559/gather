import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { todayToronto } from '@/lib/date'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

type TimeSlot = 'morning' | 'midday' | 'evening'

function getEmailContent(slot: TimeSlot, firstName: string) {
  switch (slot) {
    case 'morning':
      return {
        subject: 'Gather \u2014 good morning \u2600\uFE0F',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
            <p style="font-size: 16px; margin-bottom: 16px;">Good morning ${firstName}.</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Take a moment to check in with your community today. How are you doing?
            </p>
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(to right, #4f46e5, #9333ea); color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
              Check in now &rarr;
            </a>
          </div>`,
      }
    case 'midday':
      return {
        subject: 'Gather \u2014 checking in on you',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
            <p style="font-size: 16px; margin-bottom: 16px;">Hey ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Just a gentle nudge \u2014 your group would love to hear from you today.
            </p>
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(to right, #4f46e5, #9333ea); color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
              Check in now &rarr;
            </a>
          </div>`,
      }
    case 'evening':
      return {
        subject: 'Gather \u2014 before the day ends',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
            <p style="font-size: 16px; margin-bottom: 16px;">Good evening ${firstName}.</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Before the day ends, take a minute to check in. Your community is here for you.
            </p>
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(to right, #4f46e5, #9333ea); color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
              Check in now &rarr;
            </a>
          </div>`,
      }
  }
}

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  const authorized =
    isVercelCron ||
    (cronSecret && headerSecret === cronSecret) ||
    (cronSecret && querySecret === cronSecret)

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slot = (request.nextUrl.searchParams.get('time') ?? 'morning') as TimeSlot
  if (!['morning', 'midday', 'evening'].includes(slot)) {
    return NextResponse.json({ error: 'Invalid time param' }, { status: 400 })
  }

  const supabase = await createClient()
  const today = todayToronto()

  // Only load members who have reminders enabled and have an email
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, email, reminder_enabled')
    .eq('reminder_enabled', true)

  if (membersError || !members) {
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }

  const { data: todayCheckIns } = await supabase
    .from('check_ins')
    .select('user_id')
    .eq('check_in_date', today)

  const checkedInIds = new Set((todayCheckIns ?? []).map((c) => c.user_id))

  const pending = members.filter((m) => m.email && !checkedInIds.has(m.id))

  if (pending.length === 0) {
    return NextResponse.json({ sent: 0, note: 'everyone has checked in or reminders disabled' })
  }

  const sends = pending.map((member) => {
    const firstName = (member.display_name ?? member.full_name).split(' ')[0]
    const { subject, html } = getEmailContent(slot, firstName)
    return resend.emails.send({ from: fromEmail, to: member.email!, subject, html })
  })

  await Promise.allSettled(sends)

  return NextResponse.json({ sent: pending.length, slot, date: today })
}
