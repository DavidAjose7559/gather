import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths that bypass auth entirely
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/api/reminders',
  '/api/birthday-reminder',
  '/api/notify-support',
  '/api/prayer',
  '/api/sermons',
  '/api/spotify',
  '/api/events',
  '/api/birthdays',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths and unauthenticated API routes pass through without a session check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No session → send to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user already on login → send home
  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Authenticated users on /onboarding are always allowed —
  // they haven't created a profile yet and need to complete setup.
  if (pathname.startsWith('/onboarding')) {
    return supabaseResponse
  }

  // For all other protected pages, verify the user has a profile.
  // New users who skipped onboarding get redirected there.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
