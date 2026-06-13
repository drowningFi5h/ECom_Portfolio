import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/store/login', req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );

  await supabase.auth.signOut();
  return res;
}
