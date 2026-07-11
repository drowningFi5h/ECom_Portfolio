'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/store/client';
import { parseSize, parsePly } from '@/lib/amazon-costs';

export interface ManufacturerBatch {
  id:              string;
  submitted_at:    string;
  batch_date:      string;
  size_h:          number;
  size_b:          number;
  size_l:          number;
  ply:             3 | 5 | 7;
  gsm:             140 | 180;
  quantity:        number;
  weight_per_unit: number;
  formula_weight:  number | null;
  rate_value:      number;
  rate_unit:       'per_kg' | 'per_piece';
  billed_amount:   number;
  our_estimate:    number | null;
  status:          'pending' | 'approved' | 'rejected';
  reviewed_at:     string | null;
  notes:           string | null;
}

export async function getPendingBatches(): Promise<{ batches: ManufacturerBatch[]; tablesMissing: boolean }> {
  try {
    const { data, error } = await createAdminClient()
      .from('manufacturer_batches')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });

    if (error?.code === '42P01') return { batches: [], tablesMissing: true };
    if (error) return { batches: [], tablesMissing: false };
    return { batches: (data ?? []) as ManufacturerBatch[], tablesMissing: false };
  } catch {
    return { batches: [], tablesMissing: false };
  }
}

export async function approveBatch(batchId: string): Promise<{ success?: boolean; error?: string }> {
  const sb = createAdminClient();

  const { data: batch, error: batchErr } = await sb
    .from('manufacturer_batches')
    .select('*')
    .eq('id', batchId)
    .single<ManufacturerBatch>();

  if (batchErr || !batch) return { error: 'Batch not found' };

  // Effective rate per kg — normalise both rate units to per-kg
  const ratePerKg = batch.rate_unit === 'per_kg'
    ? batch.rate_value
    : batch.weight_per_unit > 0 ? batch.rate_value / batch.weight_per_unit : batch.rate_value;

  // Find all inventory SKUs that match size + ply (manufacturer doesn't reveal GSM in SKU,
  // but ply is encoded — e.g. 3PL / 5PL / 7PL)
  const { data: invItems } = await sb
    .from('amazon_inventory')
    .select('seller_sku');

  const matchedSkus = (invItems ?? [])
    .filter(row => {
      const size = parseSize(row.seller_sku);
      if (!size) return false;
      return (
        size.h === batch.size_h &&
        size.b === batch.size_b &&
        size.l === batch.size_l &&
        parsePly(row.seller_sku) === batch.ply
      );
    })
    .map(r => r.seller_sku);

  if (matchedSkus.length > 0) {
    // Upsert rate + gsm_config for every matched SKU
    const upsertRows = matchedSkus.map(sku => ({
      seller_sku:  sku,
      rate_per_kg: ratePerKg,
      gsm_config:  String(batch.gsm),
    }));

    const { error: upsertErr } = await sb
      .from('amazon_product_costs')
      .upsert(upsertRows, { onConflict: 'seller_sku', ignoreDuplicates: false });

    if (upsertErr) return { error: upsertErr.message };
  }

  await sb
    .from('manufacturer_batches')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', batchId);

  revalidatePath('/management/amazon/inventory');
  return { success: true };
}

export async function rejectBatch(batchId: string): Promise<{ success?: boolean; error?: string }> {
  const { error } = await createAdminClient()
    .from('manufacturer_batches')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', batchId);

  if (error) return { error: error.message };
  revalidatePath('/management/amazon/inventory');
  return { success: true };
}
