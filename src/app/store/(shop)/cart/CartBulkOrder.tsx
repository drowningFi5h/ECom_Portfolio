'use client';

import { useState, useTransition } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { submitBulkOrder } from '../bulk-order/actions';
import { effectivePrice, formatPrice } from '@/lib/store';
import type { CartItemFull, BulkOrderItem, ShippingAddress } from '@/lib/store';
import type { RequestDefaults } from '../[slug]/SampleRequestModal';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const ic = 'w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]';
const lc = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

interface Props {
  items:         CartItemFull[];
  totalEstimate: number;
  defaults:      RequestDefaults;
}

export default function CartBulkOrder({ items, totalEstimate, defaults }: Props) {
  const [gstError, setGstError]       = useState('');
  const [success, setSuccess]         = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition]  = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (gstError) return;
    const fd  = new FormData(e.currentTarget);
    const gst = (fd.get('gst_number') as string).trim().toUpperCase();
    if (gst && !GSTIN_RE.test(gst)) { setGstError('Invalid GSTIN format'); return; }

    const bulkItems: BulkOrderItem[] = items.map(item => ({
      product_id:   item.product.id,
      product_name: item.product.name,
      product_slug: item.product.slug,
      variant_id:   item.variant_id,
      variant_name: item.variant?.name ?? null,
      quantity:     item.quantity,
      unit_price:   effectivePrice(item.product, item.variant),
    }));

    const address: ShippingAddress = {
      name:    fd.get('name') as string,
      line1:   fd.get('address_line1') as string,
      line2:   (fd.get('address_line2') as string) || undefined,
      city:    fd.get('city') as string,
      state:   fd.get('state') as string,
      pincode: fd.get('pincode') as string,
      country: 'IN',
    };

    startTransition(async () => {
      const res = await submitBulkOrder({
        type:             'bulk',
        name:             fd.get('name') as string,
        email:            fd.get('email') as string,
        phone:            fd.get('phone') as string,
        company:          fd.get('company') as string,
        gst_number:       gst,
        notes:            fd.get('notes') as string,
        user_id:          defaults.user_id,
        items:            bulkItems,
        total_estimate:   totalEstimate,
        shipping_address: address,
      });
      if (res.success) setSuccess(true);
      else setSubmitError(res.error ?? 'Something went wrong');
    });
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <p className="font-bold text-green-800 text-lg">Request submitted!</p>
        <p className="text-sm text-green-600 mt-1">
          We&apos;ll review your list and get back within 1-2 business days with pricing and availability.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="mb-6">
        <h2 className="font-bold text-slate-900 text-lg">Submit your request</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          We&apos;ll review your list and send a quote. Payment via bank transfer after confirmation.
        </p>
      </div>

      {/* Estimated total */}
      <div className="bg-stone-50 rounded-xl px-4 py-3 flex items-center justify-between mb-6">
        <span className="text-sm text-slate-600">
          {items.length} {items.length === 1 ? 'item' : 'items'} &middot; estimated total
        </span>
        <span className="font-bold text-[#0b3b46] text-lg">{formatPrice(totalEstimate)}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contact */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Contact details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lc}>Full name</label>
              <input name="name" type="text" required defaultValue={defaults.name} placeholder="Your name" className={ic} />
            </div>
            <div>
              <label className={lc}>Email</label>
              <input name="email" type="email" required defaultValue={defaults.email} placeholder="you@company.com" className={ic} />
            </div>
            <div>
              <label className={lc}>Phone</label>
              <input name="phone" type="tel" defaultValue={defaults.phone} placeholder="+91 98765 43210" className={ic} />
            </div>
            <div>
              <label className={lc}>Company</label>
              <input name="company" type="text" defaultValue={defaults.company} placeholder="Your company" className={ic} />
            </div>
          </div>
          <div className="mt-3">
            <label className={lc}>GSTIN</label>
            <input name="gst_number" type="text" defaultValue={defaults.gst_number}
              onChange={e => {
                e.target.value = e.target.value.toUpperCase();
                setGstError(e.target.value && !GSTIN_RE.test(e.target.value) ? 'Invalid GSTIN format' : '');
              }}
              maxLength={15} placeholder="27AAPFU0939F1ZV" className={`${ic} uppercase`} />
            {gstError && <p className="text-xs text-red-600 mt-1">{gstError}</p>}
          </div>
        </div>

        {/* Shipping address */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Shipping address</p>
          <div className="space-y-3">
            <div>
              <label className={lc}>Address line 1</label>
              <input name="address_line1" type="text" required defaultValue={defaults.address_line1}
                placeholder="Building, street" className={ic} />
            </div>
            <div>
              <label className={lc}>
                Address line 2 <span className="font-normal normal-case text-stone-400">(optional)</span>
              </label>
              <input name="address_line2" type="text" defaultValue={defaults.address_line2}
                placeholder="Area, landmark" className={ic} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lc}>City</label>
                <input name="city" type="text" required defaultValue={defaults.city}
                  placeholder="Mumbai" className={ic} />
              </div>
              <div>
                <label className={lc}>State</label>
                <input name="state" type="text" required defaultValue={defaults.state}
                  placeholder="Maharashtra" className={ic} />
              </div>
              <div>
                <label className={lc}>Pincode</label>
                <input name="pincode" type="text" required defaultValue={defaults.pincode}
                  pattern="[0-9]{6}" maxLength={6} placeholder="400001" className={ic} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={lc}>Notes / requirements</label>
          <textarea name="notes" rows={3}
            placeholder="Delivery timeline, payment terms, custom requirements, etc."
            className={`${ic} resize-none`} />
        </div>

        {submitError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
        )}

        <button type="submit" disabled={isPending || !!gstError}
          className="w-full bg-[#0b3b46] text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0d4a57] transition-colors">
          {isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            : 'Submit bulk order request'}
        </button>
      </form>
    </div>
  );
}
