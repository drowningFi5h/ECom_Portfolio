import { createAdminClient } from '@/lib/store/client';
import { Star, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getReviewData() {
  const sb = createAdminClient();

  const [ordersRes, logsRes] = await Promise.all([
    sb.from('amazon_orders')
      .select('amazon_order_id, status, purchase_date, order_total_amount, order_total_currency, ship_city, ship_state')
      .in('status', ['Shipped', 'Delivered'])
      .order('purchase_date', { ascending: false })
      .limit(200),
    sb.from('amazon_alert_log')
      .select('reference, sent_at')
      .eq('alert_type', 'review_request'),
  ]);

  const orders   = ordersRes.data ?? [];
  const requested = new Map((logsRes.data ?? []).map(l => [l.reference, l.sent_at]));

  const now = new Date();
  return orders.map(o => {
    const age     = Math.floor((now.getTime() - new Date(o.purchase_date).getTime()) / 86_400_000);
    const eligible = age >= 5 && age <= 30;
    return {
      ...o,
      age_days:   age,
      eligible,
      requested:  requested.has(o.amazon_order_id),
      requested_at: requested.get(o.amazon_order_id) ?? null,
    };
  });
}

export default async function ReviewsPage() {
  const orders = await getReviewData();

  const total     = orders.length;
  const requested = orders.filter(o => o.requested).length;
  const eligible  = orders.filter(o => o.eligible && !o.requested).length;
  const tooNew    = orders.filter(o => o.age_days < 5).length;
  const expired   = orders.filter(o => o.age_days > 30 && !o.requested).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--amz-charcoal)' }}>Review Requests</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--amz-charcoal-soft)' }}>
            Automated via SP-API Solicitations · runs daily at 10:00 AM IST
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MiniStat icon={<Star className="h-4 w-4" />}         label="Requests sent"   value={requested} color="var(--amz-teal-dark)"  bg="var(--amz-teal-light)" />
        <MiniStat icon={<Clock className="h-4 w-4" />}        label="Eligible now"    value={eligible}  color="#d97706"               bg="#fffbeb" />
        <MiniStat icon={<CheckCircle className="h-4 w-4" />}  label="Too new (<5d)"  value={tooNew}    color="var(--amz-charcoal-soft)" bg="var(--amz-beige)" />
        <MiniStat icon={<AlertTriangle className="h-4 w-4" />} label="Window expired" value={expired}   color="#dc2626"               bg="#fef2f2" />
      </div>

      {/* How it works */}
      <div className="rounded-2xl border p-5 mb-6" style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--amz-charcoal)' }}>How it works</h3>
        <p className="text-sm" style={{ color: 'var(--amz-charcoal-soft)' }}>
          Every day at 10 AM, the scheduler finds all Shipped/Delivered orders aged 5–30 days that haven&apos;t had a request sent,
          and fires Amazon&apos;s native <strong>review + seller feedback solicitation</strong> through the SP-API.
          Amazon sends the email on their end — no custom email templates needed. Each order can only be requested once.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-x-auto" style={{ background: '#fff', borderColor: 'var(--amz-beige-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs font-semibold uppercase tracking-wide"
              style={{ background: 'var(--amz-beige)', borderColor: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
              <th className="text-left px-5 py-3.5">Order ID</th>
              <th className="text-left px-3 py-3.5">Purchased</th>
              <th className="text-center px-3 py-3.5">Age</th>
              <th className="text-left px-3 py-3.5">Ship to</th>
              <th className="text-center px-3 py-3.5">Status</th>
              <th className="text-center px-3 py-3.5">Review Request</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => (
              <tr key={order.amazon_order_id}
                className="border-b last:border-0"
                style={{ borderColor: 'var(--amz-beige)', background: i % 2 !== 0 ? 'var(--amz-cream)' : '#fff' }}>
                <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--amz-charcoal)' }}>
                  {order.amazon_order_id}
                </td>
                <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--amz-charcoal-soft)' }}>
                  {new Date(order.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: order.age_days < 5 ? 'var(--amz-beige)' : order.age_days > 30 ? '#fef2f2' : 'var(--amz-teal-light)',
                      color:      order.age_days < 5 ? 'var(--amz-charcoal-soft)' : order.age_days > 30 ? '#b91c1c' : 'var(--amz-teal-dark)',
                    }}>
                    {order.age_days}d
                  </span>
                </td>
                <td className="px-3 py-3 text-xs" style={{ color: 'var(--amz-charcoal-soft)' }}>
                  {[order.ship_city, order.ship_state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-3 text-center text-xs font-medium" style={{ color: 'var(--amz-charcoal-soft)' }}>
                  {order.status}
                </td>
                <td className="px-3 py-3 text-center">
                  {order.requested ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: 'var(--amz-teal-dark)' }}>
                      <CheckCircle className="h-3.5 w-3.5" /> Sent
                    </span>
                  ) : order.eligible ? (
                    <span className="text-xs font-semibold" style={{ color: '#d97706' }}>Pending</span>
                  ) : order.age_days < 5 ? (
                    <span className="text-xs" style={{ color: 'var(--amz-charcoal-muted)' }}>Too new</span>
                  ) : (
                    <span className="text-xs" style={{ color: '#dc2626' }}>Expired</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--amz-charcoal-muted)' }}>
            No shipped/delivered orders found.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: 'var(--amz-beige-border)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--amz-charcoal-soft)' }}>{label}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
