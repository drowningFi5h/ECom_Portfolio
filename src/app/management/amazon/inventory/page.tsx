import { createAdminClient } from '@/lib/store/client';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import InventoryFilters from './InventoryFilters';
import PendingUpdates   from './PendingUpdates';
import { getPendingBatches } from './actions';

export const dynamic = 'force-dynamic';

const LOW = 10;

export interface InventoryRow {
  seller_sku:      string;
  asin:            string | null;
  product_name:    string | null;
  fulfillable_qty: number;
  listing_price:   number | null;
  listing_status:  string | null;
  synced_at:       string;
}

async function getInventory(): Promise<InventoryRow[]> {
  try {
    const { data, error } = await createAdminClient()
      .from('amazon_inventory')
      .select('seller_sku, asin, product_name, fulfillable_qty, synced_at, listing_price, listing_status')
      .order('fulfillable_qty', { ascending: true })
      .returns<InventoryRow[]>();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AmazonInventoryPage() {
  const [inventory, { batches, tablesMissing }] = await Promise.all([
    getInventory(),
    getPendingBatches(),
  ]);

  const outCount = inventory.filter(i => i.fulfillable_qty === 0).length;
  const lowCount = inventory.filter(i => i.fulfillable_qty > 0 && i.fulfillable_qty <= LOW).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
            {inventory.length} SKUs tracked · low stock threshold ≤ {LOW} units
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {outCount > 0 && (
            <Pill icon={<AlertTriangle className="h-3 w-3" />} label={`${outCount} out of stock`}
              bg="#fef2f2" color="#b91c1c" border="#fecaca" />
          )}
          {lowCount > 0 && (
            <Pill icon={<AlertTriangle className="h-3 w-3" />} label={`${lowCount} low stock`}
              bg="#fffbeb" color="#b45309" border="#fde68a" />
          )}
          {outCount === 0 && lowCount === 0 && inventory.length > 0 && (
            <Pill icon={<CheckCircle className="h-3 w-3" />} label="All stocked"
              bg="var(--amz-teal-light)" color="var(--amz-teal-dark)" border="var(--amz-teal)" />
          )}
          {batches.length > 0 && (
            <Pill icon={<Package className="h-3 w-3" />} label={`${batches.length} pending update${batches.length > 1 ? 's' : ''}`}
              bg="#fffbeb" color="#b45309" border="#fde68a" />
          )}
        </div>
      </div>

      {/* Pending manufacturer updates — admin only */}
      <PendingUpdates batches={batches} tablesMissing={tablesMissing} />

      {/* Inventory table with status filter */}
      {inventory.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border"
          style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
          <Package className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--amz-teal)' }} />
          <p className="font-medium" style={{ color: 'var(--amz-charcoal)' }}>No inventory data yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--amz-charcoal-soft)' }}>
            Run the Python inventory sync to populate SKUs.
          </p>
        </div>
      ) : (
        <InventoryFilters items={inventory} />
      )}
    </div>
  );
}

function Pill({ icon, label, bg, color, border }: {
  icon: React.ReactNode; label: string; bg: string; color: string; border: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
      style={{ background: bg, color, borderColor: border }}>
      {icon}{label}
    </span>
  );
}
