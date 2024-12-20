import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname === '/';
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isChatPage = request.nextUrl.pathname.startsWith('/chat');

  // If trying to access chat without auth, redirect to login
  if (isChatPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If authenticated user tries to access login or home, redirect to chat
  if ((isAuthPage || isLoginPage) && token) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
