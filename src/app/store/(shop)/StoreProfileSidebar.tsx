'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { User, X, Receipt, Settings, LogOut, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '919263699286';
const WHATSAPP_MESSAGE = encodeURIComponent('Hi! I need help with my RBS Store order.');

export default function StoreProfileSidebar({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger — profile icon button in header */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open profile"
        className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors border ${
          dark
            ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border-white/15'
            : 'bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 border-stone-200'
        }`}>
        <User className="h-[18px] w-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="profile-sidebar"
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>

            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setOpen(false)} />

            {/* Panel */}
            <motion.aside
              className="absolute right-0 top-0 bottom-0 w-[300px] bg-[#FAFAF8] flex flex-col shadow-2xl border-l border-stone-200"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#0b3b46]/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#0b3b46]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-stone-900 leading-tight">My Account</p>
                    <p className="text-[11px] text-stone-400 leading-tight mt-0.5">RBS Store</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                <SidebarLink href="/store/orders" icon={Receipt} label="My Orders" sub="Track and view past orders" onClick={() => setOpen(false)} />
                <SidebarLink href="/store/account" icon={Settings} label="Account Settings" sub="Update profile and preferences" onClick={() => setOpen(false)} />
              </nav>

              {/* WhatsApp CTA */}
              <div className="px-4 pb-4">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full rounded-xl bg-[#25D366] hover:bg-[#20bc5a] active:bg-[#1aab50] px-4 py-3.5 transition-colors group">
                  <MessageCircle className="h-5 w-5 text-white shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-tight">Chat on WhatsApp</p>
                    <p className="text-[11px] text-white/75 leading-tight mt-0.5">Get support instantly</p>
                  </div>
                </a>
              </div>

              {/* Sign out */}
              <div className="px-3 pb-6 border-t border-stone-100 pt-3">
                <form action="/api/store/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors text-[13px] font-medium">
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </form>
              </div>

            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarLink({
  href, icon: Icon, label, sub, onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-stone-100 transition-colors group">
      <div className="h-8 w-8 rounded-lg bg-stone-100 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors border border-stone-200/70">
        <Icon className="h-3.5 w-3.5 text-stone-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-stone-800 leading-tight">{label}</p>
        <p className="text-[11px] text-stone-400 leading-tight mt-0.5 truncate">{sub}</p>
      </div>
    </Link>
  );
}
