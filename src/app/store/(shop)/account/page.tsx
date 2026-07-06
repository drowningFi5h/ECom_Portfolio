import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { User, Mail, Shield } from 'lucide-react';
import AddressForm from './AddressForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/store/login?next=/store/account');

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const meta = user.user_metadata ?? {};

  const formDefaults = {
    full_name:     (meta.full_name     as string) ?? '',
    phone:         (meta.phone         as string) ?? (user.phone ?? ''),
    company:       (meta.company       as string) ?? '',
    gst_number:    (meta.gst_number    as string) ?? '',
    address_line1: (meta.address_line1 as string) ?? '',
    address_line2: (meta.address_line2 as string) ?? '',
    city:          (meta.city          as string) ?? '',
    state:         (meta.state         as string) ?? '',
    pincode:       (meta.pincode       as string) ?? '',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 min-h-[calc(100vh-62px)]">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Account Settings</h1>
      <p className="text-sm text-stone-400 mb-8">Your profile and account details</p>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden mb-6">

        <div className="p-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[#0b3b46]/10 flex items-center justify-center shrink-0">
            <User className="h-6 w-6 text-[#0b3b46]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-stone-900">
              {formDefaults.full_name || user.email?.split('@')[0] || 'Store user'}
            </p>
            <p className="text-[13px] text-stone-400 mt-0.5">Member since {joinedDate}</p>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center gap-3">
          <Mail className="h-4 w-4 text-stone-400 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Email</p>
            <p className="text-[14px] text-stone-800">{user.email}</p>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center gap-3">
          <Shield className="h-4 w-4 text-stone-400 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Account ID</p>
            <p className="text-[13px] text-stone-500 font-mono">{user.id}</p>
          </div>
        </div>

      </div>

      {/* Editable contact + address */}
      <AddressForm defaults={formDefaults} />

      {/* Sign out */}
      <div className="mt-8">
        <form action="/api/store/logout" method="POST">
          <button
            type="submit"
            className="text-[13px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Sign out of this account
          </button>
        </form>
      </div>
    </div>
  );
}
