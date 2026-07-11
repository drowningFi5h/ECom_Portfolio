import { getAmazonOrders, formatAmazonPrice, ORDER_STATUS_STYLES } from '@/lib/amazon';

export const dynamic = 'force-dynamic';

const ALL_STATUSES = ['Pending', 'Unshipped', 'PartiallyShipped', 'Shipped', 'Delivered', 'Canceled', 'Unfulfillable'];

export default async function AmazonOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const orders = await getAmazonOrders(500);

  const filtered = filterStatus && filterStatus !== 'all'
    ? orders.filter(o => o.status === filterStatus)
    : orders;

  const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>{orders.length} total orders synced</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {(['Pending', 'Unshipped', 'PartiallyShipped'] as const).map(s =>
            counts[s] > 0 ? (
              <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[s]}`}>
                {s} <span className="font-bold">{counts[s]}</span>
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        <FilterChip label="All" value="all" current={filterStatus} count={orders.length} />
        {ALL_STATUSES.map(s => (
          <FilterChip key={s} label={s} value={s} current={filterStatus} count={counts[s]} />
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
          <p style={{ color: 'var(--amz-charcoal-muted)' }}>No orders match this filter.</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                <th className="text-left px-5 py-3.5">Order ID</th>
                <th className="text-left px-3 py-3.5">Date</th>
                <th className="text-left px-3 py-3.5">Status</th>
                <th className="text-left px-3 py-3.5">Channel</th>
                <th className="text-left px-3 py-3.5">Ship to</th>
                <th className="text-center px-3 py-3.5">Shipped</th>
                <th className="text-center px-3 py-3.5">Pending</th>
                <th className="text-right px-5 py-3.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, i) => (
                <tr key={order.amazon_order_id}
                  className="border-b last:border-0 transition-colors"
                  style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}
                >
                  <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--amz-charcoal)' }}>
                    {order.amazon_order_id}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap" style={{ color: 'var(--amz-charcoal-soft)' }}>
                    {new Date(order.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[order.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: order.fulfillment_channel === 'AFN' ? 'var(--amz-teal-light)' : 'var(--amz-beige)',
                        color:      order.fulfillment_channel === 'AFN' ? 'var(--amz-teal-dark)'  : 'var(--amz-charcoal-soft)',
                      }}>
                      {order.fulfillment_channel === 'AFN' ? 'FBA' : order.fulfillment_channel === 'MFN' ? 'FBM' : order.fulfillment_channel ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--amz-charcoal-soft)' }}>
                    {[order.ship_city, order.ship_state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-3.5 text-center tabular-nums" style={{ color: 'var(--amz-charcoal-soft)' }}>
                    {order.num_items_shipped}
                  </td>
                  <td className="px-3 py-3.5 text-center tabular-nums">
                    <span style={{ color: order.num_items_unshipped > 0 ? '#d97706' : 'var(--amz-charcoal-muted)', fontWeight: order.num_items_unshipped > 0 ? 600 : 400 }}>
                      {order.num_items_unshipped}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap" style={{ color: 'var(--amz-charcoal)' }}>
                    {formatAmazonPrice(order.order_total_amount, order.order_total_currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, value, current, count }: { label: string; value: string; current?: string; count: number }) {
  const active = (current ?? 'all') === value;
  return (
    <a
      href={value === 'all' ? '/management/amazon/orders' : `/management/amazon/orders?status=${value}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
      style={{
        background:   active ? 'var(--amz-teal-dark)'  : 'var(--amz-beige)',
        color:        active ? '#fff'                   : 'var(--amz-charcoal-soft)',
        borderColor:  active ? 'var(--amz-teal-dark)'  : 'var(--amz-beige-border)',
      }}
    >
      {label}
      {count > 0 && (
        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
          style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--amz-beige-border)', color: active ? '#fff' : 'var(--amz-charcoal-soft)' }}>
          {count}
        </span>
      )}
    </a>
  );
}
