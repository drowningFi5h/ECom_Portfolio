import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/dashboard/login', req.url));
  res.cookies.set('dash_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/dashboard',
    maxAge: 0,
  });
  return res;
}
