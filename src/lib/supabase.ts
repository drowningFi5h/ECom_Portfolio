import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export type SubmissionStatus = 'new' | 'read' | 'archived';

export interface Submission {
  id: string;
  created_at: string;
  name: string;
  email: string;
  service: string;
  message: string;
  status: SubmissionStatus;
}

// Untyped base client — typed helpers below handle column safety
function client() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export function insertSubmission(data: { name: string; email: string; service: string; message: string }) {
  return client().from('submissions').insert(data);
}

export function getSubmissions() {
  return client()
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Submission[]>();
}

export function updateSubmissionStatus(id: string, status: SubmissionStatus) {
  return client().from('submissions').update({ status }).eq('id', id);
}

export function removeSubmission(id: string) {
  return client().from('submissions').delete().eq('id', id);
}
