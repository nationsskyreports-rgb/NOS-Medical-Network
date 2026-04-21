import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const token = request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value;

    if (!token) {
      // Check for any supabase auth cookie
      const hasCookie = [...request.cookies.getAll()].some(c => c.name.includes('auth-token'));
      if (!hasCookie) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
