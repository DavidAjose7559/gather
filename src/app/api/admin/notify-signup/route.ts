import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <noreply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const name = profile.display_name ?? profile.full_name
  const email = profile.email ?? user.email ?? 'unknown'
  const adminLink = `${appUrl}/admin`

  await resend.emails.send({
    from: fromEmail,
    to: 'davidajose30@gmail.com',
    subject: `New sign-up pending approval — ${name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <p style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">New sign-up waiting for approval</p>
        <div style="background: #f3f4f6; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">${name}</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">${email}</p>
        </div>
        <p style="font-size: 14px; color: #374151; margin-bottom: 20px; line-height: 1.6;">
          Head to the admin page to approve their account and assign them access.
        </p>
        <a href="${adminLink}" style="display: inline-block; background: #6C63FF; color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          Review in admin →
        </a>
      </div>`,
  })

  return NextResponse.json({ ok: true })
}
