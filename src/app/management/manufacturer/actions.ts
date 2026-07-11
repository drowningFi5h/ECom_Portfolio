'use server';

import { createAdminClient } from '@/lib/store/client';
import { parseSize, parsePly } from '@/lib/amazon-costs';
import type { ManufacturerBatch } from '../amazon/inventory/actions';

export interface WarehouseAddress {
  id:           string;
  label:        string;
  address_line: string;
  city:         string;
  state:        string;
  pincode:      string;
  created_at:   string;
}

export interface SizeOption {
  key:   string;   // "6x5x3"
  h:     number;
  b:     number;
  l:     number;
  label: string;   // "6×5×3 in"
}

export async function getWarehouseAddresses(): Promise<WarehouseAddress[]> {
  try {
    const { data } = await createAdminClient()
      .from('warehouse_addresses')
      .select('*')
      .order('created_at', { ascending: false });
    return (data ?? []) as WarehouseAddress[];
  } catch {
    return [];
  }
}

export async function saveWarehouseAddress(
  formData: FormData,
): Promise<{ address?: WarehouseAddress; error?: string }> {
  const label       = (formData.get('label') as string)?.trim();
  const addressLine = (formData.get('address_line') as string)?.trim();
  const city        = (formData.get('city') as string)?.trim();
  const state       = (formData.get('state') as string)?.trim();
  const pincode     = (formData.get('pincode') as string)?.trim();

  if (!label || !addressLine || !city || !state || !pincode) {
    return { error: 'All address fields are required' };
  }

  const { data, error } = await createAdminClient()
    .from('warehouse_addresses')
    .insert({ label, address_line: addressLine, city, state, pincode })
    .select()
    .single();

  if (error) return { error: error.message };
  return { address: data as WarehouseAddress };
}

export async function getAvailableSizes(): Promise<SizeOption[]> {
  try {
    const { data } = await createAdminClient()
      .from('amazon_inventory')
      .select('seller_sku');

    const map = new Map<string, SizeOption>();
    for (const row of data ?? []) {
      const size = parseSize(row.seller_sku);
      if (!size) continue;
      const key = `${size.h}x${size.b}x${size.l}`;
      if (!map.has(key)) {
        map.set(key, { key, ...size, label: `${size.h}×${size.b}×${size.l} in` });
      }
    }

    return [...map.values()].sort((a, b) => a.h * a.b * a.l - b.h * b.b * b.l);
  } catch {
    return [];
  }
}

export async function getPreviousBatches(
  sizeH: number, sizeB: number, sizeL: number,
  ply: number, gsm: number,
): Promise<ManufacturerBatch[]> {
  try {
    const { data } = await createAdminClient()
      .from('manufacturer_batches')
      .select('*')
      .eq('size_h', sizeH)
      .eq('size_b', sizeB)
      .eq('size_l', sizeL)
      .eq('ply',    ply)
      .eq('gsm',    gsm)
      .neq('status', 'rejected')
      .order('submitted_at', { ascending: false })
      .limit(5);

    return (data ?? []) as ManufacturerBatch[];
  } catch {
    return [];
  }
}

export async function submitBatch(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const sizeKey       = formData.get('size_key') as string;
  const sizeH         = parseFloat(formData.get('size_h') as string);
  const sizeB         = parseFloat(formData.get('size_b') as string);
  const sizeL         = parseFloat(formData.get('size_l') as string);
  const ply           = parseInt(formData.get('ply') as string);
  const gsm           = parseInt(formData.get('gsm') as string);
  const quantity      = parseInt(formData.get('quantity') as string);
  const weightPerUnit = parseFloat(formData.get('weight_per_unit') as string);
  const formulaWeight = parseFloat(formData.get('formula_weight') as string) || null;
  const rateValue     = parseFloat(formData.get('rate_value') as string);
  const rateUnit      = formData.get('rate_unit') as 'per_kg' | 'per_piece';
  const billedAmount  = parseFloat(formData.get('billed_amount') as string);
  const ourEstimate   = parseFloat(formData.get('our_estimate') as string) || null;
  const batchDate          = formData.get('batch_date') as string;
  const warehouseAddressId = (formData.get('warehouse_address_id') as string) || null;
  const shipmentFeeRaw     = formData.get('shipment_fee') as string;
  const shipmentFee        = shipmentFeeRaw ? parseFloat(shipmentFeeRaw) : null;
  const notes              = (formData.get('notes') as string)?.trim() || null;

  if (!sizeKey || isNaN(ply) || isNaN(gsm) || isNaN(quantity) || isNaN(weightPerUnit) ||
      isNaN(rateValue) || isNaN(billedAmount) || !batchDate) {
    return { error: 'All required fields must be filled' };
  }

  if (![3, 5, 7].includes(ply))       return { error: 'PLY must be 3, 5 or 7' };
  if (![140, 180].includes(gsm))      return { error: 'GSM must be 140 or 180' };
  if (!['per_kg', 'per_piece'].includes(rateUnit)) return { error: 'Invalid rate unit' };

  const { error } = await createAdminClient()
    .from('manufacturer_batches')
    .insert({
      batch_date:      batchDate,
      size_h:          sizeH,
      size_b:          sizeB,
      size_l:          sizeL,
      ply,
      gsm,
      quantity,
      weight_per_unit: weightPerUnit,
      formula_weight:  formulaWeight,
      rate_value:      rateValue,
      rate_unit:       rateUnit,
      billed_amount:   billedAmount,
      our_estimate:    ourEstimate,
      status:               'pending',
      warehouse_address_id: warehouseAddressId,
      shipment_fee:         shipmentFee,
      notes,
    });

  if (error) return { error: error.message };
  return { success: true };
}
