'use server';

import { revalidatePath } from 'next/cache';
import { updateSubmissionStatus, removeSubmission, type SubmissionStatus } from '@/lib/supabase';

export async function updateStatus(id: string, status: SubmissionStatus) {
  const { error } = await updateSubmissionStatus(id, status);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

export async function deleteSubmission(id: string) {
  const { error } = await removeSubmission(id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
