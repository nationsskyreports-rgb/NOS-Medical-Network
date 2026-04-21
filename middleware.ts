import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const cookies = request.cookies.getAll();
    const hasSession = cookies.some(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
