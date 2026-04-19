import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { todayToronto } from '@/lib/date'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = todayToronto()

  const [membersRes, checkInsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, display_name, email, reminder_enabled').eq('reminder_enabled', true),
    supabase.from('check_ins').select('user_id').eq('check_in_date', today),
  ])

  const members = membersRes.data ?? []
  const checkedInIds = new Set((checkInsRes.data ?? []).map((c) => c.user_id))
  const pending = members.filter((m) => m.email && !checkedInIds.has(m.id))

  if (pending.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const emailBatch = pending.map((member) => {
    const firstName = (member.display_name ?? member.full_name).split(' ')[0]
    return {
      from: fromEmail,
      to: member.email!,
      subject: 'Gather — gentle nudge from your leader 🙏',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
          <p style="font-size:16px;margin-bottom:16px;">Hey ${firstName},</p>
          <p style="font-size:16px;line-height:1.6;margin-bottom:24px;">
            Your community would love to hear from you today. Take a moment to check in — it only takes a minute.
          </p>
          <a href="${appUrl}" style="display:inline-block;background:linear-gradient(to right,#4f46e5,#9333ea);color:white;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;font-size:15px;">
            Check in now &rarr;
          </a>
          <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
            — <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">Gather</a> · gatherdaily.app
          </p>
        </div>`,
    }
  })

  await resend.batch.send(emailBatch)

  return NextResponse.json({ sent: pending.length })
}
