import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { todayToronto } from '@/lib/date'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

function messageToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/→ gatherdaily\.app/g, `<a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">→ gatherdaily.app</a>`)
}

const DEFAULT_MESSAGE = `Hey everyone 🙏🏾\n\nJust a reminder to check in on Gather today. It only takes a minute and it means a lot to the group to know how you're doing.\n\n→ gatherdaily.app`

export async function POST(request: Request) {
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

  let message = DEFAULT_MESSAGE
  try {
    const body = await request.json()
    if (body.message?.trim()) message = body.message.trim()
  } catch { /* no body is fine */ }

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

  const htmlBody = messageToHtml(message)

  const emailBatch = pending.map((member) => ({
    from: fromEmail,
    to: member.email!,
    subject: 'Gather — check-in reminder',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
        <p style="font-size:16px;line-height:1.8;margin-bottom:24px;">${htmlBody}</p>
        <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
          — <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">Gather</a> · gatherdaily.app
        </p>
      </div>`,
  }))

  await resend.batch.send(emailBatch)

  return NextResponse.json({ sent: pending.length })
}
