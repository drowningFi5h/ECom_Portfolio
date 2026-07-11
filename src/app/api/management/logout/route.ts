import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/management/login', req.url));
  // Clear both admin cookie and role cookie
  const base = { httpOnly: true, sameSite: 'lax' as const, path: '/management', maxAge: 0 };
  res.cookies.set('dash_session', '', base);
  res.cookies.set('mgmt_session', '', base);
  return res;
}
