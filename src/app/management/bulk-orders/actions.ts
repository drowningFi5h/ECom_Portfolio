'use server';

import { revalidatePath } from 'next/cache';
import { adminUpdateBulkOrderStatus } from '@/lib/store';
import type { BulkOrderStatus } from '@/lib/store';

export async function updateBulkOrderStatus(id: string, status: BulkOrderStatus) {
  const { error } = await adminUpdateBulkOrderStatus(id, status);
  if (error) throw new Error(error.message);
  revalidatePath('/management/bulk-orders');
}
