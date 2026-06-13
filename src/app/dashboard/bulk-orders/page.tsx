import { adminGetAllBulkOrders, formatPrice } from '@/lib/store';
import { updateBulkOrderStatus } from './actions';
import type { BulkOrderStatus, BulkOrderRequest } from '@/lib/store';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<BulkOrderStatus, string> = {
  new:       'bg-yellow-50 text-yellow-700 border-yellow-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  quoted:    'bg-purple-50 text-purple-700 border-purple-200',
  closed:    'bg-green-50 text-green-700 border-green-200',
};

const ALL_STATUSES: BulkOrderStatus[] = ['new', 'contacted', 'quoted', 'closed'];

export default async function BulkOrdersPage() {
  const { data: requests } = await adminGetAllBulkOrders();
  const list = requests ?? [];

  const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = list.filter(r => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{list.length} total requests</p>
        </div>
        {/* Status summary pills */}
        <div className="flex gap-2 flex-wrap justify-end">
          {ALL_STATUSES.map(s => (
            <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[s]}`}>
              {s} <span className="font-bold">{counts[s]}</span>
            </span>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-400">No bulk order requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(req => (
            <BulkOrderCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function BulkOrderCard({ req }: { req: BulkOrderRequest }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-slate-900">{req.name}</span>
            {req.company && <span className="text-sm text-slate-500">· {req.company}</span>}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[req.status]}`}>
              {req.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
              req.type === 'sample'
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {req.type === 'sample' ? '🧪 Sample' : '📦 Bulk'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <a href={`mailto:${req.email}`} className="hover:text-[#0b3b46] hover:underline">{req.email}</a>
            {req.phone && <span>{req.phone}</span>}
            {req.gst_number && (
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{req.gst_number}</span>
            )}
            <span>{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        {req.total_estimate != null && (
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-0.5">Estimated value</p>
            <p className="font-bold text-[#0b3b46] text-lg">{formatPrice(req.total_estimate)}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-6 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Items requested</p>
        <div className="space-y-1.5">
          {req.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                {item.product_name}
                {item.variant_name && <span className="text-slate-400"> · {item.variant_name}</span>}
                <span className="text-slate-400 ml-2">×{item.quantity}</span>
              </span>
              <span className="font-medium text-slate-900">{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping address */}
      {req.shipping_address && (
        <div className="px-6 pb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ship to</p>
          <p className="text-sm text-slate-600">
            {req.shipping_address.line1}
            {req.shipping_address.line2 ? `, ${req.shipping_address.line2}` : ''}
            {`, ${req.shipping_address.city}`}
            {`, ${req.shipping_address.state}`}
            {` — ${req.shipping_address.pincode}`}
          </p>
        </div>
      )}

      {/* Notes */}
      {req.notes && (
        <div className="px-6 pb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-slate-600 italic whitespace-pre-line">{req.notes}</p>
        </div>
      )}

      {/* Status update */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Update status:</span>
        <div className="flex gap-2 flex-wrap">
          {ALL_STATUSES.filter(s => s !== req.status).map(s => (
            <form key={s} action={async () => { 'use server'; await updateBulkOrderStatus(req.id, s); }}>
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
