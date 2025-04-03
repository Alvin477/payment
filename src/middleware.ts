import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip middleware for non-admin routes
  if (!request.nextUrl.pathname.startsWith('/api/admin/')) {
    return NextResponse.next();
  }

  // Skip auth check for login and setup endpoints
  if (request.nextUrl.pathname === '/api/admin/auth' || 
      request.nextUrl.pathname === '/api/admin/setup') {
    return NextResponse.next();
  }

  // Admin API route protection
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid auth header' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
}; 