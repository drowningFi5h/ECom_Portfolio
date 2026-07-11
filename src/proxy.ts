import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifySession } from '@/lib/management-session';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Management portal — role-based auth
  if (pathname.startsWith('/management')) {
    if (pathname === '/management/login') return NextResponse.next();

    const secret = process.env.DASHBOARD_SESSION_SECRET ?? '';

    // 1. Hardcoded admin (full access to everything)
    const adminSession = req.cookies.get('dash_session')?.value;
    if (adminSession && adminSession === secret) return NextResponse.next();

    // 2. Role-based session
    const roleSession = req.cookies.get('mgmt_session')?.value;
    if (roleSession) {
      const payload = await verifySession(roleSession, secret);
      if (payload) {
        const allowed = payload.allowedPaths.some(
          p => pathname === p || pathname.startsWith(p + '/'),
        );
        if (allowed) return NextResponse.next();
        // Logged in but path not in their role — send to their landing page
        const landing = payload.allowedPaths[0] ?? '/management/login';
        return NextResponse.redirect(new URL(landing, req.url));
      }
    }

    const loginUrl = new URL('/management/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Store — only cart/orders/account require auth; browsing is public
  if (pathname.startsWith('/store')) {
    if (pathname === '/store/login') return NextResponse.next();

    const protected_ = ['/store/orders', '/store/account'];
    if (!protected_.some(p => pathname.startsWith(p))) return NextResponse.next();

    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (toSet) => toSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          }),
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const loginUrl = new URL('/store/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/management/:path*', '/store', '/store/:path*'],
};
