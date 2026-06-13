import { NextRequest, NextResponse } from 'next/server';
import { insertSubmission } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { name, email, service, message } = await req.json();

  if (!name || !email || !service || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { error } = await insertSubmission({ name, email, service, message });

  if (error) {
    console.error('Supabase error:', error.message);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
