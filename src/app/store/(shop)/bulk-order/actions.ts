'use server';

import { revalidatePath } from 'next/cache';
import { adminInsertBulkOrder } from '@/lib/store';
import type { BulkOrderItem, BulkOrderType, ShippingAddress } from '@/lib/store';

export async function submitBulkOrder(data: {
  type:              BulkOrderType;
  name:              string;
  email:             string;
  phone?:            string;
  company?:          string;
  gst_number?:       string;
  notes?:            string;
  items:             BulkOrderItem[];
  total_estimate?:   number;
  shipping_address?: ShippingAddress | null;
  user_id?:          string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await adminInsertBulkOrder({
    type:             data.type,
    status:           'new',
    name:             data.name.trim(),
    email:            data.email.trim().toLowerCase(),
    phone:            data.phone?.trim() || null,
    company:          data.company?.trim() || null,
    gst_number:       data.gst_number?.trim().toUpperCase() || null,
    notes:            data.notes?.trim() || null,
    items:            data.items,
    total_estimate:   data.total_estimate ?? null,
    shipping_address: data.shipping_address ?? null,
    user_id:          data.user_id ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/management/bulk-orders');
  return { success: true };
}
