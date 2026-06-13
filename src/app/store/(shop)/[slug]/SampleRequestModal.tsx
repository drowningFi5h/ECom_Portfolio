'use client';

import { useState, useTransition } from 'react';
import { X, Loader2, CheckCircle2, FlaskConical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { submitBulkOrder } from '../bulk-order/actions';
import { effectivePrice, formatPrice } from '@/lib/store';
import type { Product, ProductVariant, ShippingAddress } from '@/lib/store';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface RequestDefaults {
  name:          string;
  email:         string;
  phone:         string;
  company:       string;
  gst_number:    string;
  address_line1: string;
  address_line2: string;
  city:          string;
  state:         string;
  pincode:       string;
  user_id:       string;
}

interface Props {
  product:  Product;
  variants: ProductVariant[];
  defaults: RequestDefaults;
}

const ic = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]';
const lc = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

export default function SampleRequestModal({ product, variants, defaults }: Props) {
  const activeVariants = variants.filter(v => v.active);
  const [open, setOpen]       = useState(false);
  const [selected, setSelected] = useState<ProductVariant | null>(activeVariants[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [gstError, setGstError] = useState('');
  const [success, setSuccess]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition]  = useTransition();

  function close() { setOpen(false); setSuccess(false); setSubmitError(''); setGstError(''); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (gstError) return;
    const fd  = new FormData(e.currentTarget);
    const gst = (fd.get('gst_number') as string).trim().toUpperCase();
    if (gst && !GSTIN_RE.test(gst)) { setGstError('Invalid GSTIN format'); return; }

    const unitPrice = effectivePrice(product, selected);
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
        type:             'sample',
        name:             fd.get('name') as string,
        email:            fd.get('email') as string,
        phone:            fd.get('phone') as string,
        company:          fd.get('company') as string,
        gst_number:       gst,
        notes:            fd.get('notes') as string,
        user_id:          defaults.user_id,
        shipping_address: address,
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
      if (res.success) setSuccess(true);
      else setSubmitError(res.error ?? 'Something went wrong');
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-slate-300 text-slate-700 rounded-xl py-3 font-semibold text-sm hover:border-[#0b3b46] hover:text-[#0b3b46] transition-all">
        <FlaskConical className="h-4 w-4" /> Request a sample
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          key="sample-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
            initial={{ y: 60, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="font-bold text-slate-900">Request a sample</h2>
                <p className="text-xs text-slate-500 mt-0.5">{product.name}</p>
              </div>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 p-1"><X className="h-5 w-5" /></button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 text-lg mb-2">Sample request sent!</h3>
                <p className="text-sm text-slate-500 mb-6">We&apos;ll confirm availability and dispatch details within 1–2 business days.</p>
                <button onClick={close} className="px-6 py-2.5 bg-[#0b3b46] text-white rounded-xl text-sm font-semibold hover:bg-[#0d4a57]">Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Variant */}
                {activeVariants.length > 0 && (
                  <div>
                    <p className={lc}>Option</p>
                    <div className="flex flex-wrap gap-2">
                      {activeVariants.map(v => (
                        <button key={v.id} type="button" onClick={() => setSelected(v)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${selected?.id === v.id ? 'bg-[#0b3b46] text-white border-[#0b3b46]' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity — small for samples */}
                <div>
                  <p className={lc}>Sample quantity</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-lg leading-none">−</button>
                      <span className="px-4 py-2 text-sm font-semibold text-slate-900 min-w-[3rem] text-center">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(q => Math.min(5, q + 1))}
                        className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-lg leading-none">+</button>
                    </div>
                    <span className="text-xs text-slate-400">Max 5 units per sample request</span>
                  </div>
                  {quantity > 0 && (
                    <p className="text-sm font-semibold text-[#0b3b46] mt-2">
                      {formatPrice(effectivePrice(product, selected) * quantity)} estimated
                    </p>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Contact details</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className={lc}>GSTIN</label>
                      <input name="gst_number" type="text" defaultValue={defaults.gst_number}
                        onChange={e => { e.target.value = e.target.value.toUpperCase(); setGstError(e.target.value && !GSTIN_RE.test(e.target.value) ? 'Invalid GSTIN format' : ''); }}
                        maxLength={15} placeholder="27AAPFU0939F1ZV" className={`${ic} uppercase`} />
                      {gstError && <p className="text-xs text-red-600 mt-1">{gstError}</p>}
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Shipping address</p>
                  <div className="space-y-3">
                    <div>
                      <label className={lc}>Address line 1</label>
                      <input name="address_line1" type="text" required defaultValue={defaults.address_line1} placeholder="Building, street" className={ic} />
                    </div>
                    <div>
                      <label className={lc}>Address line 2 <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                      <input name="address_line2" type="text" defaultValue={defaults.address_line2} placeholder="Area, landmark" className={ic} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lc}>City</label>
                        <input name="city" type="text" required defaultValue={defaults.city} placeholder="Mumbai" className={ic} />
                      </div>
                      <div>
                        <label className={lc}>State</label>
                        <input name="state" type="text" required defaultValue={defaults.state} placeholder="Maharashtra" className={ic} />
                      </div>
                      <div>
                        <label className={lc}>Pincode</label>
                        <input name="pincode" type="text" required defaultValue={defaults.pincode}
                          pattern="[0-9]{6}" maxLength={6} placeholder="400001" className={ic} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={lc}>Notes</label>
                  <textarea name="notes" rows={2} placeholder="Any specific requirements?" className={`${ic} resize-none`} />
                </div>

                {submitError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>}

                <button type="submit" disabled={isPending || !!gstError}
                  className="w-full bg-[#0b3b46] text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0d4a57]">
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send sample request'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
