import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {

  const response = NextResponse.next({
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
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  /*
  --------------------------------
  NOT LOGGED IN → BLOCK DASHBOARD
  --------------------------------
  */

    // No valid user -> session expired or not logged in
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
        const url = new URL('/login', request.url)
        url.searchParams.set('expired', 'true')
        return NextResponse.redirect(url)
    }

  /*
  --------------------------------
  LOGGED IN → AUTO REDIRECT
  --------------------------------
  */

  if (user && (path === '/login' || path === '/register')) {

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || "student"
    if (role === "admin") {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))
    }

    return NextResponse.redirect(
      new URL(`/dashboard/${role}/${user.id}`, request.url)
    )
  }

  /*
  --------------------------------
  PROTECT DASHBOARD ROLE ACCESS
  --------------------------------
  */

  if (user && path.startsWith('/dashboard')) {
    // Fetch role from profile (ideally you'd use a cookie for speed, but this works)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role

    // Only admins can access /dashboard/admin
    if (path.startsWith('/dashboard/admin') && userRole !== 'admin') {
      const fallbackRole = userRole || 'student'
      return NextResponse.redirect(new URL(`/dashboard/${fallbackRole}/${user.id}`, request.url))
    }

    // If they are a student trying to access /dashboard/instructor/...
    if (path.includes('/instructor') && userRole !== 'instructor') {
      return NextResponse.redirect(new URL(`/dashboard/student/${user.id}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register'
  ],
}
