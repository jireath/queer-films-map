import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Export the middleware function explicitly
export async function middleware(request) {
  // Create a new response
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Setting cookies on the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // Removing cookies from the response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if it exists
  await supabase.auth.getSession()

  return response
}

// Define which routes should be processed by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - Static files
     * - API routes
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
}