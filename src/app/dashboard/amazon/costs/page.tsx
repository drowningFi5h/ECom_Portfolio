import { createAdminClient } from '@/lib/store/client';
import { Calculator } from 'lucide-react';
import CostsTable from './CostsTable';

export const dynamic = 'force-dynamic';

export interface InventoryRow {
  seller_sku:     string;
  product_name:   string | null;
  listing_price:  number | null;
  fulfillable_qty: number | null;
}

export interface CostRow {
  seller_sku:    string;
  gsm_config:    string | null;
  rate_per_kg:   number;
  box_h:         number | null;
  box_b:         number | null;
  box_l:         number | null;
  pack_qty:      number;
  referral_pct:  number;
  shipping_cost: number;
}

export interface FeeEstimate {
  seller_sku:       string;
  referral_pct:     number;
  referral_fee:     number;
  variable_closing: number;
  listing_price:    number;
  fetched_at:       string;
}

async function getData() {
  const sb = createAdminClient();
  const [invRes, costRes, feeRes] = await Promise.all([
    sb.from('amazon_inventory')
      .select('seller_sku, product_name, listing_price, fulfillable_qty')
      .order('seller_sku'),
    sb.from('amazon_product_costs')
      .select('seller_sku, gsm_config, rate_per_kg, box_h, box_b, box_l, referral_pct, shipping_cost'),
    sb.from('amazon_fee_estimates')
      .select('seller_sku, referral_pct, referral_fee, variable_closing, listing_price, fetched_at'),
  ]);

  const costMap = new Map<string, CostRow>(
    (costRes.data ?? []).map(r => [r.seller_sku, r as CostRow]),
  );
  const feeMap = new Map<string, FeeEstimate>(
    (feeRes.data ?? []).map(r => [r.seller_sku, r as FeeEstimate]),
  );

  const rows = (invRes.data ?? []).map(inv => ({
    ...(inv as InventoryRow),
    ...(costMap.get(inv.seller_sku) ?? {
      gsm_config:    null,
      rate_per_kg:   60,
      box_h:         null,
      box_b:         null,
      box_l:         null,
      referral_pct:  5,
      shipping_cost: 0,
    }),
    pack_qty: costMap.get(inv.seller_sku)?.pack_qty ?? null,
    feeEstimate: feeMap.get(inv.seller_sku) ?? null,
  }));

  const tablesMissing = costRes.error?.code === '42P01';
  const feesSynced = !feeRes.error && (feeRes.data?.length ?? 0) > 0;
  return { rows, tablesMissing, feesSynced };
}

export default async function CostsPage() {
  const { rows, tablesMissing, feesSynced } = await getData();

  const configured = rows.filter(r => r.gsm_config);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Product Costs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
            Box cost calculated from SKU dimensions · select GSM config per SKU
          </p>
        </div>
        {!tablesMissing && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full border"
            style={{ background: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)', borderColor: 'var(--amz-teal)' }}>
            {configured.length} / {rows.length} configured
          </span>
        )}
      </div>

      {tablesMissing ? (
        <SetupCard />
      ) : rows.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
          <Calculator className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--amz-teal)' }} />
          <p className="font-medium" style={{ color: 'var(--amz-charcoal)' }}>No inventory synced yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--amz-charcoal-soft)' }}>Run the inventory sync first to populate SKUs.</p>
        </div>
      ) : (
        <>
          {!feesSynced && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border px-4 py-3"
              style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <span className="text-amber-500 mt-0.5 shrink-0">⚡</span>
              <p className="text-sm text-amber-700">
                Amazon fee estimates not synced yet — referral % and closing fee suggestions will be blank.
                {' '}<code className="text-xs bg-amber-100 px-1 py-0.5 rounded">python -m fees.sync_fees</code>
              </p>
            </div>
          )}
          <CostsTable rows={rows} />
        </>
      )}
    </div>
  );
}

function SetupCard() {
  return (
    <div className="rounded-2xl border p-8" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
      <h3 className="font-semibold mb-3" style={{ color: 'var(--amz-charcoal)' }}>Database setup required</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--amz-charcoal-soft)' }}>
        Run this in your Supabase SQL editor:
      </p>
      <pre className="text-xs p-4 rounded-xl overflow-x-auto" style={{ background: 'var(--amz-charcoal)', color: 'var(--amz-cream)' }}>{`CREATE TABLE IF NOT EXISTS amazon_product_costs (
    seller_sku   TEXT PRIMARY KEY,
    gsm_config   TEXT,
    rate_per_kg  NUMERIC DEFAULT 60,
    box_h        NUMERIC,
    box_b        NUMERIC,
    box_l        NUMERIC,
    updated_at   TIMESTAMPTZ DEFAULT now()
);`}</pre>
    </div>
  );
}
