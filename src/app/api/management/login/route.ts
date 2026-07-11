import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/store/client';
import { verifyPassword, signSession } from '@/lib/management-session';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path:     '/management',
  maxAge:   60 * 60 * 24 * 30, // 30 days
};

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const secret = process.env.DASHBOARD_SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  // ── 1. Check management_users table ──────────────────────────────────────────
  try {
    const { data: user } = await createAdminClient()
      .from('management_users')
      .select('id, username, display_name, password_hash, active, management_roles(name, label, allowed_paths)')
      .eq('username', username.trim())
      .eq('active', true)
      .maybeSingle<{
        id: string;
        username: string;
        display_name: string | null;
        password_hash: string;
        active: boolean;
        management_roles: { name: string; label: string; allowed_paths: string[] } | null;
      }>();

    if (user) {
      if (!verifyPassword(password, user.password_hash)) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      const role = user.management_roles;
      if (!role) {
        return NextResponse.json({ error: 'User has no role assigned' }, { status: 403 });
      }

      const token = await signSession({
        userId:       user.id,
        username:     user.username,
        displayName:  user.display_name ?? user.username,
        role:         role.name,
        allowedPaths: role.allowed_paths,
      }, secret);

      // Update last_login (fire-and-forget)
      createAdminClient()
        .from('management_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});

      const landing = role.allowed_paths[0] ?? '/management';
      const res = NextResponse.json({ ok: true, redirect: landing });
      res.cookies.set('mgmt_session', token, { ...COOKIE_OPTS, secure: process.env.NODE_ENV === 'production' });
      return res;
    }
  } catch {
    // Table may not exist yet — fall through to admin check
  }

  // ── 2. Hardcoded admin fallback ───────────────────────────────────────────────
  const validUser = process.env.DASHBOARD_ADMIN_USER;
  const validPass = process.env.DASHBOARD_ADMIN_PASS;

  if (!validUser || !validPass) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (username?.trim() !== validUser || password !== validPass) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('dash_session', secret, { ...COOKIE_OPTS, secure: process.env.NODE_ENV === 'production' });
  return res;
}
