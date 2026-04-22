import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // API routes handle their own auth internally — never redirect them
  if (pathname.startsWith('/api/')) return supabaseResponse

  const publicPaths = ['/login', '/auth/callback']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Skip profile checks during onboarding (profile doesn't exist yet)
  if (user && pathname.startsWith('/onboarding')) return supabaseResponse

  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_worship_team, is_worship_only, is_approved')
      .eq('id', user.id)
      .single()

    // No profile yet — let the page handle redirect to /onboarding
    if (!profile) return supabaseResponse

    // Unapproved users can only see /pending
    if (!profile.is_approved) {
      if (pathname !== '/pending') {
        const url = request.nextUrl.clone()
        url.pathname = '/pending'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Approved user on /pending — send them home
    if (pathname === '/pending') {
      const url = request.nextUrl.clone()
      url.pathname = profile.is_worship_only ? '/worship' : '/'
      return NextResponse.redirect(url)
    }

    // Worship-only users are confined to /worship
    if (profile.is_worship_only && !pathname.startsWith('/worship')) {
      const url = request.nextUrl.clone()
      url.pathname = '/worship'
      return NextResponse.redirect(url)
    }

    // Worship routes require worship_team, worship_only, or admin
    if (pathname.startsWith('/worship')) {
      if (!profile.is_worship_team && !profile.is_worship_only && profile.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
