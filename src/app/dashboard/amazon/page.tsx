import { getAmazonStats, getRecentAmazonOrders, getAmazonInventory, formatAmazonPrice, ORDER_STATUS_STYLES } from '@/lib/amazon';
import { TrendingUp, ShoppingCart, AlertTriangle, Clock, Zap } from 'lucide-react';
import RefreshButton from './RefreshButton';

export const dynamic = 'force-dynamic';

export default async function AmazonOverviewPage() {
  const [stats, recentOrders, inventory] = await Promise.all([
    getAmazonStats(),
    getRecentAmazonOrders(8),
    getAmazonInventory(),
  ]);

  const hasData      = recentOrders.length > 0 || inventory.length > 0;
  const lowStockItems = inventory.filter(i => i.fulfillable_qty <= 10);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Amazon Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
            {stats.lastSynced
              ? `Last synced ${new Date(stats.lastSynced).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'No sync data yet — run the Python automation to populate'}
          </p>
        </div>
        {stats.lastSynced && <RefreshButton lastSynced={stats.lastSynced} />}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue today"     value={formatAmazonPrice(stats.revenueToday, stats.currency)} icon={<TrendingUp className="h-4 w-4" />} color="#16a34a" empty={!hasData} />
        <StatCard label="Orders (7 days)"   value={stats.orders7d.toString()}              icon={<ShoppingCart className="h-4 w-4" />}  color="var(--amz-teal-dark)" empty={!hasData} />
        <StatCard label="Low stock SKUs"    value={stats.lowStockCount.toString()}         icon={<AlertTriangle className="h-4 w-4" />} color={stats.lowStockCount > 0 ? '#d97706' : '#16a34a'} empty={!hasData} />
        <StatCard label="Pending shipments" value={stats.pendingShipments.toString()}      icon={<Clock className="h-4 w-4" />}         color="var(--amz-charcoal)" empty={!hasData} />
      </div>

      {!hasData ? (
        <SetupPrompt />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Recent orders */}
          <div className="xl:col-span-2">
            <SectionLabel>Recent Orders</SectionLabel>
            <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--amz-charcoal-muted)' }}>No orders yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--amz-beige)', color: 'var(--amz-charcoal-soft)' }}>
                      <th className="text-left px-5 py-3">Order ID</th>
                      <th className="text-left px-3 py-3">Date</th>
                      <th className="text-left px-3 py-3">Status</th>
                      <th className="text-right px-5 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, i) => (
                      <tr key={order.amazon_order_id}
                        className="border-b last:border-0 transition-colors"
                        style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}
                      >
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--amz-charcoal)' }}>{order.amazon_order_id}</td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--amz-charcoal-soft)' }}>
                          {new Date(order.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[order.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: 'var(--amz-charcoal)' }}>
                          {formatAmazonPrice(order.order_total_amount, order.order_total_currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Low stock */}
          <div>
            <SectionLabel>
              Low Stock Alerts
              {lowStockItems.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                  style={{ background: '#fef3c7', color: '#b45309' }}>
                  {lowStockItems.length}
                </span>
              )}
            </SectionLabel>
            <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
              {lowStockItems.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium" style={{ color: '#16a34a' }}>All SKUs well-stocked</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--amz-charcoal-muted)' }}>Threshold: ≤ 10 units</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--amz-beige)' }}>
                  {lowStockItems.slice(0, 8).map(item => (
                    <div key={item.seller_sku} className="px-4 py-3 flex items-center justify-between gap-3"
                      style={{ borderColor: 'var(--amz-beige)' }}>
                      <div className="min-w-0">
                        <p className="text-xs font-mono truncate" style={{ color: 'var(--amz-charcoal)' }}>{item.seller_sku}</p>
                        {item.product_name && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>{item.product_name}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums"
                        style={{ color: item.fulfillable_qty === 0 ? '#dc2626' : '#d97706' }}>
                        {item.fulfillable_qty}
                        <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--amz-charcoal-muted)' }}>units</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: 'var(--amz-charcoal-soft)' }}>
      {children}
    </h2>
  );
}

function StatCard({ label, value, icon, color, empty }: {
  label: string; value: string; icon: React.ReactNode; color: string; empty: boolean;
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--amz-charcoal-soft)' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: empty ? 'var(--amz-beige-border)' : color }}>
        {empty ? '—' : value}
      </p>
    </div>
  );
}

function SetupPrompt() {
  return (
    <div className="rounded-2xl border-2 border-dashed p-10 text-center"
      style={{ borderColor: 'var(--amz-beige-border)', background: 'var(--amz-beige)' }}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
        style={{ background: 'var(--amz-teal-light)' }}>
        <Zap className="h-6 w-6" style={{ color: 'var(--amz-teal-dark)' }} />
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--amz-charcoal)' }}>No Amazon data yet</h3>
      <p className="text-sm max-w-sm mx-auto mb-5" style={{ color: 'var(--amz-charcoal-soft)' }}>
        Set up your SP-API credentials and run the Python sync to see orders, inventory, and revenue here.
      </p>
      <ol className="text-left inline-block text-sm space-y-1.5" style={{ color: 'var(--amz-charcoal)' }}>
        <li><code className="text-xs px-1.5 py-0.5 rounded mr-1" style={{ background: 'var(--amz-beige-border)' }}>1.</code> Copy <code className="text-xs px-1 rounded" style={{ background: 'var(--amz-beige-border)' }}>.env.example → .env</code></li>
        <li><code className="text-xs px-1.5 py-0.5 rounded mr-1" style={{ background: 'var(--amz-beige-border)' }}>2.</code> Run Supabase schema SQL</li>
        <li><code className="text-xs px-1.5 py-0.5 rounded mr-1" style={{ background: 'var(--amz-beige-border)' }}>3.</code> <code className="text-xs px-1 rounded" style={{ background: 'var(--amz-beige-border)' }}>python -m auth.sp_api_client</code></li>
        <li><code className="text-xs px-1.5 py-0.5 rounded mr-1" style={{ background: 'var(--amz-beige-border)' }}>4.</code> Run order sync — data appears instantly</li>
      </ol>
    </div>
  );
}
