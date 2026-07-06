import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const validUser = process.env.DASHBOARD_ADMIN_USER;
  const validPass = process.env.DASHBOARD_ADMIN_PASS;
  const secret    = process.env.DASHBOARD_SESSION_SECRET;

  if (!validUser || !validPass || !secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (username?.trim() !== validUser || password !== validPass) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('dash_session', secret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/dashboard',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
