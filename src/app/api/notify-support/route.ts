import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { check_in_id } = await request.json()
  if (!check_in_id) {
    return NextResponse.json({ error: 'check_in_id required' }, { status: 400 })
  }

  const [checkInRes, submitterRes] = await Promise.all([
    supabase.from('check_ins').select('*').eq('id', check_in_id).single(),
    supabase.from('profiles').select('full_name, display_name').eq('id', user.id).single(),
  ])

  const checkIn = checkInRes.data
  if (!checkIn || checkIn.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const submitterName =
    submitterRes.data?.display_name ?? submitterRes.data?.full_name ?? 'Someone in your group'

  // Determine recipient profile ids based on visibility
  let recipientIds: string[] = []

  if (checkIn.visibility_type === 'everyone') {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', user.id)
    recipientIds = (data ?? []).map((p) => p.id)
  } else {
    const { data } = await supabase
      .from('visibility_grants')
      .select('granted_to')
      .eq('check_in_id', check_in_id)
    recipientIds = (data ?? []).map((g) => g.granted_to)
  }

  if (recipientIds.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Load recipients with email
  const { data: recipients } = await supabase
    .from('profiles')
    .select('full_name, display_name, email')
    .in('id', recipientIds)

  const eligible = (recipients ?? []).filter((r) => !!r.email)

  if (eligible.length === 0) {
    return NextResponse.json({ sent: 0, note: 'no recipients with email addresses' })
  }

  const checkInUrl = `${appUrl}/checkin/${check_in_id}`

  const sends = eligible.map((recipient) => {
    const recipientName = recipient.display_name ?? recipient.full_name
    return resend.emails.send({
      from: fromEmail,
      to: recipient.email!,
      subject: '[Gather] Someone in your group needs support',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName},</p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            <strong>${submitterName}</strong> checked in today and asked if someone could reach out.
            Even a short message can mean a lot.
          </p>
          <p style="margin-bottom: 24px;">
            <a href="${checkInUrl}"
               style="display: inline-block; background: linear-gradient(to right, #4f46e5, #9333ea); color: white; font-weight: 600; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 15px;">
              View their check-in →
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">
            You're receiving this because you're part of the Gather group.
          </p>
        </div>
      `,
    })
  })

  const results = await Promise.allSettled(sends)
  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`[notify-support] ${failed.length} of ${eligible.length} email(s) failed`, failed)
  }

  return NextResponse.json({ sent: eligible.length - failed.length })
}
