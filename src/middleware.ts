import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const authPages = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const { pathname } = request.nextUrl;

  // Authenticated user visiting login/signup/landing → redirect to dashboard
  if (token && (authPages.includes(pathname) || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user visiting protected route → redirect to login
  if (!token && !authPages.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // '/', landing Page - Not Protected
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/services/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};
