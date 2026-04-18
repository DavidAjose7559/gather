import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { subject, message } = await request.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const { data: members, error } = await supabase
    .from('profiles')
    .select('full_name, display_name, email')

  if (error || !members) {
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }

  const emails = members.filter((m) => m.email)

  const htmlBody = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  const sends = emails.map((member) => {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <p style="font-size: 13px; font-weight: 600; color: #6C63FF; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px;">
          A message from your Gather community
        </p>
        <div style="font-size: 16px; line-height: 1.7; color: #111827; margin-bottom: 32px;">
          ${htmlBody}
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 16px;"/>
        <p style="font-size: 13px; color: #9ca3af;">
          — Sent via <a href="${appUrl}" style="color: #6C63FF; text-decoration: none;">Gather</a> · gatherdaily.app
        </p>
      </div>`

    return resend.emails.send({ from: fromEmail, to: member.email!, subject: subject.trim(), html })
  })

  const results = await Promise.allSettled(sends)
  const sent = results.filter((r) => r.status === 'fulfilled').length

  return NextResponse.json({ sent, count: emails.length })
}
