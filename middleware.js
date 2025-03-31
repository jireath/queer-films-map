import { NextResponse } from 'next/server'

// Simple middleware that allows all requests to proceed
export function middleware(request) {
  return NextResponse.next()
}

// Define which routes should be processed by the middleware
export const config = {
  matcher: [
    // Skip middleware for auth routes, static files, etc.
    '/((?!_next/static|_next/image|favicon.ico|public/|api/|auth/).*)',
  ],
}