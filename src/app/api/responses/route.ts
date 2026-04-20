import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Gather <no-reply@gatherdaily.app>'
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const checkInId = searchParams.get('check_in_id')

  if (!checkInId) {
    return NextResponse.json({ error: 'check_in_id required' }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('responses')
    .select('id, check_in_id, body, is_anonymous, created_at, responder_id, parent_id')
    .eq('check_in_id', checkInId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sanitized = (data ?? []).map((r) => ({
    id: r.id,
    check_in_id: r.check_in_id,
    body: r.body,
    is_anonymous: r.is_anonymous,
    created_at: r.created_at,
    responder_id: r.is_anonymous ? null : r.responder_id,
    parent_id: r.parent_id ?? null,
  }))

  return NextResponse.json(sanitized)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { check_in_id, responder_id, body: responseBody, is_anonymous, parent_id } = body

  if (!check_in_id || !responseBody?.trim()) {
    return NextResponse.json({ error: 'check_in_id and body are required' }, { status: 400 })
  }

  if (responder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('responses')
    .insert({
      check_in_id,
      responder_id: user.id,
      body: responseBody.trim(),
      is_anonymous: !!is_anonymous,
      ...(parent_id ? { parent_id } : {}),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget: send email notification
  ;(async () => {
    try {
      if (parent_id) {
        // Reply: notify the original responder
        const { data: parentResponse } = await supabase
          .from('responses')
          .select('responder_id, is_anonymous')
          .eq('id', parent_id)
          .single()

        if (
          !parentResponse ||
          parentResponse.is_anonymous ||
          parentResponse.responder_id === user.id
        ) return

        const [originalResponderRes, replierRes] = await Promise.all([
          supabase.from('profiles').select('full_name, display_name, email').eq('id', parentResponse.responder_id).single(),
          supabase.from('profiles').select('full_name, display_name').eq('id', user.id).single(),
        ])

        const originalResponder = originalResponderRes.data
        if (!originalResponder?.email) return

        const replierName = is_anonymous
          ? 'Someone'
          : (replierRes.data?.display_name ?? replierRes.data?.full_name ?? 'A member')
        const firstName = (originalResponder.display_name ?? originalResponder.full_name).split(' ')[0]
        const checkInUrl = `${appUrl}/checkin/${check_in_id}`

        await resend.emails.send({
          from: fromEmail,
          to: originalResponder.email,
          subject: `${replierName} replied to your response`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
              <p style="font-size:16px;margin-bottom:16px;">Hey ${firstName},</p>
              <p style="font-size:16px;line-height:1.6;margin-bottom:8px;">
                <strong>${replierName}</strong> replied to your response:
              </p>
              <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="font-size:15px;color:#374151;line-height:1.6;margin:0;">${responseBody.trim()}</p>
              </div>
              <a href="${checkInUrl}" style="display:inline-block;background:linear-gradient(to right,#4f46e5,#9333ea);color:white;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;font-size:15px;">
                View thread &rarr;
              </a>
              <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
                — <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">Gather</a> · gatherdaily.app
              </p>
            </div>`,
        })
      } else {
        // Top-level response: notify the check-in owner
        const { data: checkIn } = await supabase
          .from('check_ins')
          .select('user_id')
          .eq('id', check_in_id)
          .single()

        if (!checkIn || checkIn.user_id === user.id) return

        const [ownerRes, responderRes] = await Promise.all([
          supabase.from('profiles').select('full_name, display_name, email').eq('id', checkIn.user_id).single(),
          supabase.from('profiles').select('full_name, display_name').eq('id', user.id).single(),
        ])

        const owner = ownerRes.data
        if (!owner?.email) return

        const ownerFirstName = (owner.display_name ?? owner.full_name).split(' ')[0]
        const responderName = is_anonymous
          ? 'A member of your group'
          : (responderRes.data?.display_name ?? responderRes.data?.full_name ?? 'A member')
        const checkInUrl = `${appUrl}/checkin/${check_in_id}`

        await resend.emails.send({
          from: fromEmail,
          to: owner.email,
          subject: `${responderName} responded to your check-in`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
              <p style="font-size:16px;margin-bottom:16px;">Hey ${ownerFirstName},</p>
              <p style="font-size:16px;line-height:1.6;margin-bottom:8px;">
                <strong>${responderName}</strong> responded to your check-in:
              </p>
              <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="font-size:15px;color:#374151;line-height:1.6;margin:0;">${responseBody.trim()}</p>
              </div>
              <a href="${checkInUrl}" style="display:inline-block;background:linear-gradient(to right,#4f46e5,#9333ea);color:white;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;font-size:15px;">
                View check-in &rarr;
              </a>
              <p style="font-size:13px;color:#9ca3af;margin-top:32px;">
                — <a href="${appUrl}" style="color:#6C63FF;text-decoration:none;">Gather</a> · gatherdaily.app
              </p>
            </div>`,
        })
      }
    } catch {
      // ignore
    }
  })()

  return NextResponse.json(data, { status: 201 })
}
