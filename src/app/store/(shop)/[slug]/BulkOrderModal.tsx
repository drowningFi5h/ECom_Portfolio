'use client';

import { useState, useTransition, useRef } from 'react';
import { X, Loader2, CheckCircle2, ClipboardList } from 'lucide-react';
import { submitBulkOrder } from '../bulk-order/actions';
import { effectivePrice, formatPrice } from '@/lib/store';
import type { Product, ProductVariant } from '@/lib/store';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

interface DefaultValues {
  name:       string;
  email:      string;
  phone:      string;
  gst_number: string;
  user_id:    string;
}

interface Props {
  product:       Product;
  variants:      ProductVariant[];
  defaultValues: DefaultValues;
}

export default function BulkOrderModal({ product, variants, defaultValues }: Props) {
  const activeVariants = variants.filter(v => v.active);
  const [open, setOpen]           = useState(false);
  const [selected, setSelected]   = useState<ProductVariant | null>(activeVariants[0] ?? null);
  const [quantity, setQuantity]   = useState(10);
  const [gstError, setGstError]   = useState('');
  const [success, setSuccess]     = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function close() { setOpen(false); setSuccess(false); setSubmitError(''); setGstError(''); }

  function handleGst(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase();
    e.target.value = val;
    if (val && !GSTIN_RE.test(val)) {
      setGstError('Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)');
    } else {
      setGstError('');
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (gstError) return;
    const fd = new FormData(e.currentTarget);
    const gst = (fd.get('gst_number') as string).trim().toUpperCase();
    if (gst && !GSTIN_RE.test(gst)) { setGstError('Invalid GSTIN format'); return; }

    const unitPrice = effectivePrice(product, selected);

    startTransition(async () => {
      const res = await submitBulkOrder({
        type:        'bulk',
        name:        fd.get('name') as string,
        email:       fd.get('email') as string,
        phone:       fd.get('phone') as string,
        company:     fd.get('company') as string,
        gst_number:  gst,
        notes:       fd.get('notes') as string,
        user_id:     defaultValues.user_id,
        items: [{
          product_id:   product.id,
          product_name: product.name,
          product_slug: product.slug,
          variant_id:   selected?.id ?? null,
          variant_name: selected?.name ?? null,
          quantity,
          unit_price:   unitPrice,
        }],
        total_estimate: unitPrice * quantity,
      });
      if (res.success) {
        setSuccess(true);
      } else {
        setSubmitError(res.error ?? 'Something went wrong');
      }
    });
  }

  const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-[#0b3b46] text-[#0b3b46] rounded-xl py-3 font-semibold text-sm hover:bg-[#0b3b46] hover:text-white transition-all"
      >
        <ClipboardList className="h-4 w-4" /> Request bulk order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="font-bold text-slate-900">Request bulk order</h2>
                <p className="text-xs text-slate-500 mt-0.5">{product.name}</p>
              </div>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 text-lg mb-2">Request sent!</h3>
                <p className="text-sm text-slate-500 mb-6">
                  We&apos;ll review your request and get back to you within 1–2 business days.
                </p>
                <button onClick={close}
                  className="px-6 py-2.5 bg-[#0b3b46] text-white rounded-xl text-sm font-semibold hover:bg-[#0d4a57] transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">

                {/* Variant */}
                {activeVariants.length > 0 && (
                  <div>
                    <p className={labelCls}>Option</p>
                    <div className="flex flex-wrap gap-2">
                      {activeVariants.map(v => (
                        <button key={v.id} type="button" onClick={() => setSelected(v)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            selected?.id === v.id
                              ? 'bg-[#0b3b46] text-white border-[#0b3b46]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}>
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className={labelCls}>Quantity</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-lg leading-none">−</button>
                      <span className="px-4 py-2 text-sm font-semibold text-slate-900 min-w-[3rem] text-center">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(q => q + 1)}
                        className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-lg leading-none">+</button>
                    </div>
                    <span className="text-sm font-semibold text-[#0b3b46]">
                      {formatPrice(effectivePrice(product, selected) * quantity)} est.
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Contact details</p>

                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Full name</label>
                      <input name="name" type="text" required defaultValue={defaultValues.name}
                        placeholder="Your name" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input name="email" type="email" required defaultValue={defaultValues.email}
                        placeholder="you@company.com" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input name="phone" type="tel" defaultValue={defaultValues.phone}
                        placeholder="+91 98765 43210" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Company name</label>
                      <input name="company" type="text" placeholder="Your company" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>GSTIN</label>
                      <input name="gst_number" type="text" defaultValue={defaultValues.gst_number}
                        onChange={handleGst} maxLength={15}
                        placeholder="27AAPFU0939F1ZV" className={`${inputCls} uppercase`} />
                      {gstError && <p className="text-xs text-red-600 mt-1">{gstError}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Notes / requirements</label>
                      <textarea name="notes" rows={3}
                        placeholder="Custom requirements, delivery timeline, etc."
                        className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                </div>

                {submitError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {submitError}
                  </p>
                )}

                <button type="submit" disabled={isPending || !!gstError}
                  className="w-full bg-[#0b3b46] text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0d4a57] transition-colors">
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
