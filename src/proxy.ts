import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dashboard — cookie-based session (single admin account)
  if (pathname.startsWith('/dashboard')) {
    if (pathname === '/dashboard/login') return NextResponse.next();

    const session = req.cookies.get('dash_session')?.value;
    const secret  = process.env.DASHBOARD_SESSION_SECRET;

    if (!session || !secret || session !== secret) {
      const loginUrl = new URL('/dashboard/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
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
  matcher: ['/dashboard/:path*', '/store', '/store/:path*'],
};
