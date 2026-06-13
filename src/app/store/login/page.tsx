'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

type Mode = 'signin' | 'signup';

export default function StoreLoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [gstError, setGstError] = useState('');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const email    = fd.get('email')    as string;
    const password = fd.get('password') as string;

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push('/store');
      router.refresh();
    } else {
      const name          = fd.get('name')          as string;
      const phone         = (fd.get('phone') as string).trim();
      const company       = (fd.get('company') as string).trim();
      const gst_number    = (fd.get('gst_number') as string).trim().toUpperCase();
      const address_line1 = (fd.get('address_line1') as string).trim();
      const address_line2 = (fd.get('address_line2') as string).trim();
      const city          = (fd.get('city') as string).trim();
      const state         = (fd.get('state') as string).trim();
      const pincode       = (fd.get('pincode') as string).trim();

      if (!GSTIN_RE.test(gst_number)) {
        setGstError('Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone:     phone || null,
            company:   company || null,
            gst_number,
            address_line1,
            address_line2: address_line2 || null,
            city,
            state,
            pincode,
          },
        },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setEmailSent(true);
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#f6f3ee] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Check your email</h2>
          <p className="text-sm text-stone-500 mb-6">
            We sent a confirmation link to your email address. Click it to activate your account.
          </p>
          <button
            onClick={() => { setEmailSent(false); setMode('signin'); }}
            className="text-sm text-[#136f75] font-medium hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#0b3b46] rounded-xl px-5 py-3">
            <Image src="/logo-rbs.svg" alt="Rahul Business Services" width={120} height={40} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

          {/* Mode toggle */}
          <div className="grid grid-cols-2 border-b border-stone-100">
            {(['signin', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`py-3.5 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'text-[#0b3b46] border-b-2 border-[#0b3b46]'
                    : 'text-stone-400 hover:text-slate-600'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Full name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Phone number
                    <span className="ml-1.5 font-normal normal-case text-stone-400">(optional)</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-stone-200 rounded-l-xl bg-stone-50 text-sm text-stone-500 select-none">
                      +91
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      className="flex-1 border border-stone-200 rounded-r-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-400">OTP verification will be available soon.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Company name
                    <span className="ml-1.5 font-normal normal-case text-stone-400">(optional)</span>
                  </label>
                  <input
                    name="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Your company"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    GST Number (GSTIN)
                  </label>
                  <input
                    name="gst_number"
                    type="text"
                    required
                    maxLength={15}
                    placeholder="27AAPFU0939F1ZV"
                    onChange={e => {
                      e.target.value = e.target.value.toUpperCase();
                      const val = e.target.value;
                      setGstError(val && !GSTIN_RE.test(val) ? 'Invalid format — must be 15 characters' : '');
                    }}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46] uppercase"
                  />
                  {gstError
                    ? <p className="mt-1 text-xs text-red-600">{gstError}</p>
                    : <p className="mt-1 text-xs text-stone-400">Required for B2B invoicing. Format: 15-character GSTIN.</p>
                  }
                </div>

                {/* Shipping address */}
                <div className="border-t border-stone-100 pt-4">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Shipping address</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Address line 1</label>
                      <input name="address_line1" type="text" required placeholder="Building, street"
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Address line 2 <span className="font-normal normal-case text-stone-400">(optional)</span>
                      </label>
                      <input name="address_line2" type="text" placeholder="Area, landmark"
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">City</label>
                        <input name="city" type="text" required placeholder="Mumbai"
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">State</label>
                        <input name="state" type="text" required placeholder="Maharashtra"
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Pincode</label>
                        <input name="pincode" type="text" required pattern="[0-9]{6}" maxLength={6} placeholder="400001"
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0b3b46]/20 focus:border-[#0b3b46]" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !!gstError)}
              className="w-full bg-[#0b3b46] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0d4a57] active:bg-[#092f38] disabled:opacity-50 transition-colors mt-2"
            >
              {loading
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-5">
          Rahul Business Services &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

