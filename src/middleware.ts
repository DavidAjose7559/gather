import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// These paths are accessible without a session
const PUBLIC_PATHS = ['/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let public paths and all API routes pass through — they handle auth themselves
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For protected pages, create a Supabase client that can refresh the session
  // via cookies and carry any updated cookies forward on the response.
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated users on /onboarding are always allowed through —
  // they haven't created a profile yet and need to complete setup.
  if (pathname.startsWith('/onboarding')) {
    return supabaseResponse
  }

  // For all other protected pages, verify the user has a profile.
  // New users who bypassed onboarding get redirected there.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
