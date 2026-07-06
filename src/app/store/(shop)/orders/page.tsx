import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PackageOpen } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { adminGetBuyerOrders, formatPrice } from '@/lib/store';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:       'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped:    'bg-purple-50 text-purple-700 border-purple-200',
  delivered:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
  refunded:   'bg-stone-100 text-slate-600 border-stone-200',
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/store/login?next=/store/orders');

  const { data: orders } = await adminGetBuyerOrders(user.id);
  const list = orders ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-h-[calc(100vh-62px)]">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">My orders</h1>
      <p className="text-sm text-stone-400 mb-8">{list.length} {list.length === 1 ? 'order' : 'orders'}</p>

      {list.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
          <PackageOpen className="h-10 w-10 text-slate-200 mx-auto mb-4" />
          <p className="text-stone-400 mb-4">You have no orders yet.</p>
          <Link href="/store"
            className="text-sm font-semibold text-[#0b3b46] hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-stone-400 font-mono mb-1">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-stone-500">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[order.status] ?? 'bg-stone-50 text-slate-600 border-stone-200'}`}>
                    {order.status}
                  </span>
                  <span className="font-bold text-[#0b3b46] text-base">{formatPrice(order.total)}</span>
                </div>
              </div>

              {order.notes && (
                <p className="text-xs text-stone-500 mt-3 border-t border-stone-100 pt-3 italic">
                  Note: {order.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

