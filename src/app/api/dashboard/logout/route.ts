import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/dashboard/login', req.url));
  res.cookies.delete('rbs-auth');
  return res;
}
