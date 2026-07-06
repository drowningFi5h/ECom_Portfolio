import { getAmazonInventory } from '@/lib/amazon';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

const LOW_STOCK_THRESHOLD = 10;

export default async function AmazonInventoryPage() {
  const inventory = await getAmazonInventory();

  const lowStock   = inventory.filter(i => i.fulfillable_qty > 0 && i.fulfillable_qty <= LOW_STOCK_THRESHOLD);
  const outOfStock = inventory.filter(i => i.fulfillable_qty === 0);
  const healthy    = inventory.filter(i => i.fulfillable_qty > LOW_STOCK_THRESHOLD);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
            {inventory.length} SKUs tracked · threshold ≤ {LOW_STOCK_THRESHOLD} units
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {outOfStock.length > 0 && (
            <Pill icon={<AlertTriangle className="h-3 w-3" />} label={`${outOfStock.length} out of stock`} bg="#fef2f2" color="#b91c1c" border="#fecaca" />
          )}
          {lowStock.length > 0 && (
            <Pill icon={<AlertTriangle className="h-3 w-3" />} label={`${lowStock.length} low stock`} bg="#fffbeb" color="#b45309" border="#fde68a" />
          )}
          {outOfStock.length === 0 && lowStock.length === 0 && inventory.length > 0 && (
            <Pill icon={<CheckCircle className="h-3 w-3" />} label="All stocked" bg="var(--amz-teal-light)" color="var(--amz-teal-dark)" border="var(--amz-teal)" />
          )}
          {healthy.length > 0 && (
            <Pill icon={<Package className="h-3 w-3" />} label={`${healthy.length} healthy`} bg="var(--amz-beige)" color="var(--amz-charcoal-soft)" border="var(--amz-beige-border)" />
          )}
        </div>
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
          <p style={{ color: 'var(--amz-charcoal-muted)' }}>No inventory data yet. Run the Python inventory sync to populate.</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                <th className="text-left px-5 py-3.5">SKU</th>
                <th className="text-left px-3 py-3.5">Product</th>
                <th className="text-left px-3 py-3.5">ASIN</th>
                <th className="text-center px-3 py-3.5">Stock</th>
                <th className="text-right px-3 py-3.5">Price</th>
                <th className="text-left px-3 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5">Synced</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, i) => {
                const isOut = item.fulfillable_qty === 0;
                const isLow = !isOut && item.fulfillable_qty <= LOW_STOCK_THRESHOLD;

                let rowBg = i % 2 !== 0 ? 'var(--amz-cream)' : '#fff';
                if (isOut) rowBg = '#fff5f5';
                if (isLow) rowBg = '#fffdf0';

                return (
                  <tr key={item.seller_sku} className="border-b last:border-0 transition-colors"
                    style={{ borderColor: 'var(--amz-beige)', background: rowBg }}>
                    <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--amz-charcoal)' }}>
                      {item.seller_sku}
                    </td>
                    <td className="px-3 py-3.5 max-w-[220px] truncate" style={{ color: 'var(--amz-charcoal-soft)' }}>
                      {item.product_name ?? '—'}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--amz-charcoal-muted)' }}>
                      {item.asin ?? '—'}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1 font-bold tabular-nums"
                        style={{ color: isOut ? '#dc2626' : isLow ? '#d97706' : 'var(--amz-teal-dark)' }}>
                        {isOut && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        {item.fulfillable_qty}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium tabular-nums" style={{ color: 'var(--amz-charcoal)' }}>
                      {'listing_price' in item && (item as Record<string, unknown>).listing_price
                        ? `₹${Number((item as Record<string, unknown>).listing_price).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      {'listing_status' in item && (item as Record<string, unknown>).listing_status ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{
                            background: (item as Record<string, unknown>).listing_status === 'active' ? 'var(--amz-teal-light)' : 'var(--amz-beige)',
                            color: (item as Record<string, unknown>).listing_status === 'active' ? 'var(--amz-teal-dark)' : 'var(--amz-charcoal-soft)',
                          }}>
                          {String((item as Record<string, unknown>).listing_status)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--amz-charcoal-muted)' }}>
                      {new Date(item.synced_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pill({ icon, label, bg, color, border }: { icon: React.ReactNode; label: string; bg: string; color: string; border: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
      style={{ background: bg, color, borderColor: border }}>
      {icon}{label}
    </span>
  );
}
