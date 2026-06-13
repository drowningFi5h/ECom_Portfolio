import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dashboard — simple password cookie
  if (pathname.startsWith('/dashboard')) {
    if (pathname === '/dashboard/login') return NextResponse.next();
    const auth = req.cookies.get('rbs-auth')?.value;
    if (!auth || auth !== process.env.DASHBOARD_PASSWORD) {
      return NextResponse.redirect(new URL('/dashboard/login', req.url));
    }
    return NextResponse.next();
  }

  // Store — Supabase Auth session
  if (pathname.startsWith('/store')) {
    if (pathname === '/store/login') return NextResponse.next();

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
    if (!user) return NextResponse.redirect(new URL('/store/login', req.url));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/store', '/store/:path*'],
};
