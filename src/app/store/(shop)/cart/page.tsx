import Link from 'next/link';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { adminGetCart, formatPrice, effectivePrice } from '@/lib/store';
import CartItems from './CartItems';
import CartBulkOrder from './CartBulkOrder';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: items } = await adminGetCart(user.id);
  const cart = items ?? [];

  const subtotal = cart.reduce((sum, item) => {
    return sum + effectivePrice(item.product, item.variant) * item.quantity;
  }, 0);

  const defaults = {
    name:          user.user_metadata?.full_name     ?? '',
    email:         user.email                        ?? '',
    phone:         user.user_metadata?.phone         ?? '',
    company:       user.user_metadata?.company       ?? '',
    gst_number:    user.user_metadata?.gst_number    ?? '',
    address_line1: user.user_metadata?.address_line1 ?? '',
    address_line2: user.user_metadata?.address_line2 ?? '',
    city:          user.user_metadata?.city          ?? '',
    state:         user.user_metadata?.state         ?? '',
    pincode:       user.user_metadata?.pincode       ?? '',
    user_id:       user.id                           ?? '',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 min-h-[calc(100vh-62px)]">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-stone-900">Bulk order list</h1>
        {cart.length > 0 && (
          <span className="text-sm text-stone-400">{cart.length} {cart.length === 1 ? 'item' : 'items'} &middot; {formatPrice(subtotal)} est.</span>
        )}
      </div>
      <p className="text-sm text-stone-400 mb-8">Add products, then submit your request below. We&apos;ll confirm pricing and availability.</p>

      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
          <ClipboardList className="h-10 w-10 text-slate-200 mx-auto mb-4" />
          <p className="text-stone-500 font-medium mb-1">Your bulk list is empty</p>
          <p className="text-sm text-stone-400 mb-5">Browse products and click "Add to bulk list" to get started.</p>
          <Link href="/store"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b3b46] hover:underline">
            Browse products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Items — narrower column */}
          <div className="md:col-span-1 lg:col-span-2">
            <CartItems items={cart} />
          </div>
          {/* Request form — wider column */}
          <div className="md:col-span-1 lg:col-span-3">
            <CartBulkOrder items={cart} totalEstimate={subtotal} defaults={defaults} />
          </div>
        </div>
      )}
    </div>
  );
}

