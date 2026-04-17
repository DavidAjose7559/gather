import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  // Collect cookies that Supabase wants to set so we can apply them
  // directly to the redirect response. Using cookies() from next/headers
  // and then returning a new NextResponse.redirect() disconnects the two —
  // those set-cookie headers never reach the browser.
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let destination = next

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      destination = '/onboarding'
    }
  }

  // In production behind a reverse proxy the internal origin may differ from
  // the public host. Prefer x-forwarded-host when present.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalDev = process.env.NODE_ENV === 'development'
  const baseUrl =
    !isLocalDev && forwardedHost
      ? `https://${forwardedHost}`
      : origin

  const response = NextResponse.redirect(`${baseUrl}${destination}`)

  // Apply session cookies to the redirect response so the browser stores them.
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
