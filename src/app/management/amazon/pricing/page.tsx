import { createAdminClient } from '@/lib/store/client';
import { parseSize, parsePly, parsePackQty } from '@/lib/amazon-costs';
import PricingTable, { type SkuRow } from './PricingTable';

export const dynamic = 'force-dynamic';

async function getData() {
  const sb = createAdminClient();

  const [invRes, costRes] = await Promise.all([
    sb.from('amazon_inventory')
      .select('seller_sku, product_name, listing_price, fulfillable_qty')
      .order('seller_sku'),
    sb.from('amazon_product_costs')
      .select('seller_sku, rate_per_kg'),
  ]);

  if (invRes.error?.code === '42P01') return { rows: [], allSizes: [], tablesMissing: true };

  const costMap = new Map((costRes.data ?? []).map(r => [r.seller_sku, r]));

  const rows: SkuRow[] = [];
  const sizeSet = new Map<string, { h: number; b: number; l: number }>();

  for (const inv of invRes.data ?? []) {
    const size = parseSize(inv.seller_sku);
    if (!size) continue;

    const key = `${size.h}x${size.b}x${size.l}`;
    sizeSet.set(key, size);

    rows.push({
      seller_sku:  inv.seller_sku,
      pack_qty:    parsePackQty(inv.product_name),
      ply:         parsePly(inv.seller_sku) as 3 | 5 | 7,
      size,
      size_key:    key,
      rate_per_kg: costMap.get(inv.seller_sku)?.rate_per_kg ?? 60,
    });
  }

  // All unique sizes sorted by volume ascending
  const allSizes = [...sizeSet.entries()]
    .sort(([, a], [, b]) => a.h * a.b * a.l - b.h * b.b * b.l)
    .map(([key]) => key);

  return { rows, allSizes, tablesMissing: false };
}

export default async function PricingPage() {
  const { rows, allSizes, tablesMissing } = await getData();

  if (tablesMissing) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--amz-charcoal)' }}>Pricing</h1>
        <p className="text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>Run the inventory sync first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Pricing</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
          Select size, ply and GSM to see matching SKUs with sheet size, weight and landing cost
        </p>
      </div>
      <PricingTable rows={rows} allSizes={allSizes} />
    </div>
  );
}
