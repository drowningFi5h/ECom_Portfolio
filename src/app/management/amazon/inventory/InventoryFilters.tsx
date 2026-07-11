'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, List } from 'lucide-react';
import type { InventoryRow } from './page';

const LOW = 10;

type Status = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const TABS: { value: Status; label: string; bg: string; color: string; border: string }[] = [
  { value: 'all',          label: 'All',          bg: 'var(--amz-beige)',      color: 'var(--amz-charcoal-soft)', border: 'var(--amz-beige-border)' },
  { value: 'in_stock',     label: 'In Stock',     bg: 'var(--amz-teal-light)', color: 'var(--amz-teal-dark)',     border: 'var(--amz-teal)'         },
  { value: 'low_stock',    label: 'Low Stock',    bg: '#fffbeb',               color: '#b45309',                  border: '#fde68a'                  },
  { value: 'out_of_stock', label: 'Out of Stock', bg: '#fef2f2',               color: '#b91c1c',                  border: '#fecaca'                  },
];

export default function InventoryFilters({ items }: { items: InventoryRow[] }) {
  const [visible, setVisible] = useState(false);
  const [status,  setStatus]  = useState<Status>('all');

  const counts = useMemo(() => ({
    all:          items.length,
    in_stock:     items.filter(i => i.fulfillable_qty > LOW).length,
    low_stock:    items.filter(i => i.fulfillable_qty > 0 && i.fulfillable_qty <= LOW).length,
    out_of_stock: items.filter(i => i.fulfillable_qty === 0).length,
  }), [items]);

  const filtered = useMemo(() => {
    switch (status) {
      case 'in_stock':     return items.filter(i => i.fulfillable_qty > LOW);
      case 'low_stock':    return items.filter(i => i.fulfillable_qty > 0 && i.fulfillable_qty <= LOW);
      case 'out_of_stock': return items.filter(i => i.fulfillable_qty === 0);
      default:             return items;
    }
  }, [items, status]);

  if (!visible) {
    return (
      <div className="rounded-2xl border-2 border-dashed py-14 text-center"
        style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)' }}>
        <List className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--amz-charcoal-muted)' }} />
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--amz-charcoal-soft)' }}>
          {items.length} SKUs tracked — click to view
        </p>
        <button onClick={() => setVisible(true)}
          className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          style={{ background: 'var(--amz-teal-dark)', color: '#fff' }}>
          Get List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(t => {
          const active = status === t.value;
          return (
            <button key={t.value} onClick={() => setStatus(t.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{
                background:  active ? t.bg      : 'transparent',
                color:       active ? t.color   : 'var(--amz-charcoal-muted)',
                borderColor: active ? t.border  : 'var(--amz-beige-border)',
              }}>
              {t.label}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? 'rgba(0,0,0,0.08)' : 'var(--amz-beige)',
                  color:      active ? t.color : 'var(--amz-charcoal-muted)',
                }}>
                {counts[t.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border"
          style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
            No SKUs match this filter
          </p>
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
              {filtered.map((item, i) => {
                const isOut = item.fulfillable_qty === 0;
                const isLow = !isOut && item.fulfillable_qty <= LOW;
                let rowBg = i % 2 !== 0 ? 'var(--amz-cream)' : '#fff';
                if (isOut) rowBg = '#fff5f5';
                if (isLow) rowBg = '#fffdf0';

                return (
                  <tr key={item.seller_sku} className="border-b last:border-0"
                    style={{ borderColor: 'var(--amz-beige)', background: rowBg }}>

                    <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--amz-charcoal)' }}>
                      {item.seller_sku}
                    </td>

                    <td className="px-3 py-3.5 max-w-[220px]" style={{ color: 'var(--amz-charcoal-soft)' }}>
                      <span className="block truncate" title={item.product_name ?? undefined}>
                        {item.product_name ?? '—'}
                      </span>
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
                      {item.listing_price
                        ? `₹${Number(item.listing_price).toLocaleString('en-IN')}`
                        : '—'}
                    </td>

                    <td className="px-3 py-3.5">
                      {item.listing_status ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{
                            background: item.listing_status === 'active' ? 'var(--amz-teal-light)' : 'var(--amz-beige)',
                            color:      item.listing_status === 'active' ? 'var(--amz-teal-dark)'  : 'var(--amz-charcoal-soft)',
                          }}>
                          {item.listing_status}
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
          {filtered.length > 50 && (
            <div className="px-5 py-3 border-t text-xs text-center" style={{ borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-muted)' }}>
              Showing all {filtered.length} SKUs
            </div>
          )}
        </div>
      )}
    </div>
  );
}
