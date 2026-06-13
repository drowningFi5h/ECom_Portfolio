import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

/**
 * Server-side admin client — uses the service-role key, bypasses RLS.
 * Only import this in server actions and API routes (never in client components).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

/**
 * Browser client — uses the publishable key, respects RLS.
 * Use in client components for cart and order reads.
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
