import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const PROTECTED_ROUTES: Record<string, string[]> = {
    '/dashboard/settings': ['general_admin'],
    '/dashboard/users': ['general_admin', 'rep_head', 'rep_coordinator'],
    '/dashboard/events/new': ['unit_head', 'representative', 'general_admin'],
    '/dashboard/afis-talepleri': ['design_team', 'general_admin'],
    '/dashboard/reports/new': ['unit_head', 'representative', 'general_admin'],
    '/dashboard/inventory': ['resource_manager', 'general_admin'],
    '/dashboard/bursary-panel': ['bursary_student', 'general_admin'],
    '/dashboard/bursary-admin': ['general_admin', 'rep_head'],
    '/dashboard/logistics': ['resource_manager', 'general_admin'],
  }

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role-based protection
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = userData?.role

    for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
      if (request.nextUrl.pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
        }
        break;
      }
    }
  }

  // Redirect logged in users away from /login or /register
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
