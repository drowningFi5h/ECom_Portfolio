import { adminGetAllOrders, formatPrice } from '@/lib/store';
import { adminUpdateOrderStatus } from '@/lib/store';
import type { Order, OrderStatus } from '@/lib/store';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:       'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped:    'bg-purple-50 text-purple-700 border-purple-200',
  delivered:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
  refunded:   'bg-stone-100 text-slate-600 border-stone-200',
};

const ALL_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default async function OrdersPage() {
  const { data: orders } = await adminGetAllOrders();
  const list = orders ?? [];

  const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = list.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{list.length} total orders</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {(['pending', 'paid', 'processing', 'shipped'] as OrderStatus[]).map(s => (
            counts[s] > 0 && (
              <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[s]}`}>
                {s} <span className="font-bold">{counts[s]}</span>
              </span>
            )
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-400">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const nextStatuses: OrderStatus[] = ALL_STATUSES.filter(s => s !== order.status);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-mono text-sm font-semibold text-slate-900">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[order.status]}`}>
              {order.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          {order.shipping_address && (
            <p className="text-xs text-slate-500 mt-1">
              {order.shipping_address.name} &middot; {order.shipping_address.city}, {order.shipping_address.state}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 mb-0.5">Order total</p>
          <p className="font-bold text-[#0b3b46] text-lg">{formatPrice(order.total)}</p>
        </div>
      </div>

      {/* Payment info */}
      {(order.stripe_session_id || order.payment_intent_id) && (
        <div className="px-6 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Payment</p>
          {order.stripe_session_id && (
            <p className="text-xs font-mono text-slate-500">Session: {order.stripe_session_id}</p>
          )}
          {order.payment_intent_id && (
            <p className="text-xs font-mono text-slate-500">Intent: {order.payment_intent_id}</p>
          )}
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="px-6 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-slate-600 italic">{order.notes}</p>
        </div>
      )}

      {/* Status update */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Update status:</span>
        <div className="flex gap-2 flex-wrap">
          {nextStatuses.map(s => (
            <form key={s} action={async () => {
              'use server';
              await adminUpdateOrderStatus(order.id, s);
            }}>
              <button type="submit"
                className="px-3 py-1 rounded-lg text-xs font-semibold border capitalize transition-colors hover:bg-white border-slate-200 text-slate-600 hover:text-slate-900">
                → {s}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
