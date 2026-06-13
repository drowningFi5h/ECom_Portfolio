'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { updateUserProfile } from './actions';

const ic = 'w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46] transition-colors bg-white';
const lc = 'block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5';

interface Props {
  defaults: {
    full_name:     string;
    phone:         string;
    company:       string;
    gst_number:    string;
    address_line1: string;
    address_line2: string;
    city:          string;
    state:         string;
    pincode:       string;
  };
}

export default function AddressForm({ defaults }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]            = useState(false);
  const [error, setError]            = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateUserProfile(fd);
      if (res.success) setSaved(true);
      else setError(res.error ?? 'Something went wrong');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <p className="text-[14px] font-semibold text-stone-900">Contact &amp; Address</p>
        <p className="text-[12px] text-stone-400 mt-0.5">Saved here and pre-filled on every order</p>
      </div>

      <div className="p-6 space-y-5">

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lc}>Full name</label>
            <input name="full_name" type="text" defaultValue={defaults.full_name} placeholder="Your name" className={ic} />
          </div>
          <div>
            <label className={lc}>Phone</label>
            <input name="phone" type="tel" defaultValue={defaults.phone} placeholder="+91 98765 43210" className={ic} />
          </div>
          <div>
            <label className={lc}>Company <span className="font-normal normal-case text-stone-300">(optional)</span></label>
            <input name="company" type="text" defaultValue={defaults.company} placeholder="Your company" className={ic} />
          </div>
          <div>
            <label className={lc}>GSTIN <span className="font-normal normal-case text-stone-300">(optional)</span></label>
            <input name="gst_number" type="text" defaultValue={defaults.gst_number}
              onChange={e => { e.target.value = e.target.value.toUpperCase(); }}
              maxLength={15} placeholder="27AAPFU0939F1ZV" className={`${ic} uppercase`} />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <div>
            <label className={lc}>Address line 1</label>
            <input name="address_line1" type="text" defaultValue={defaults.address_line1}
              placeholder="Building, street" className={ic} />
          </div>
          <div>
            <label className={lc}>Address line 2 <span className="font-normal normal-case text-stone-300">(optional)</span></label>
            <input name="address_line2" type="text" defaultValue={defaults.address_line2}
              placeholder="Area, landmark" className={ic} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={lc}>City</label>
              <input name="city" type="text" defaultValue={defaults.city} placeholder="Mumbai" className={ic} />
            </div>
            <div>
              <label className={lc}>State</label>
              <input name="state" type="text" defaultValue={defaults.state} placeholder="Maharashtra" className={ic} />
            </div>
            <div>
              <label className={lc}>Pincode</label>
              <input name="pincode" type="text" defaultValue={defaults.pincode}
                pattern="[0-9]{6}" maxLength={6} placeholder="400001" className={ic} />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={isPending}
            className="bg-[#0b3b46] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0d4a57] disabled:opacity-50 transition-colors flex items-center gap-2">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

      </div>
    </form>
  );
}
