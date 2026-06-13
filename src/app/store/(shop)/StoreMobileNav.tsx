'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Package, ClipboardList, Receipt, LogOut, Settings, MessageCircle } from 'lucide-react';
import SearchBar from './SearchBar';

const WHATSAPP_NUMBER  = '919263699286';
const WHATSAPP_MESSAGE = encodeURIComponent('Hi! I need help with my RBS Store order.');

const links = [
  { href: '/store',         label: 'Products',         icon: Package       },
  { href: '/store/orders',  label: 'My orders',        icon: Receipt       },
  { href: '/store/cart',    label: 'Bulk list',        icon: ClipboardList },
  { href: '/store/account', label: 'Account settings', icon: Settings      },
];

export default function StoreMobileNav({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`sm:hidden p-2 transition-colors rounded-lg ${dark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'}`}
        aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-nav"
            className="fixed inset-0 z-50 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>

            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setOpen(false)} />

            {/* Drawer */}
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-[300px] bg-[#FAFAF8] flex flex-col shadow-2xl border-l border-stone-200"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <Image src="/logo-rbs.svg" alt="RBS Store" width={62} height={20} />
                <button
                  onClick={() => setOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pt-4 pb-2">
                <Suspense fallback={<div className="h-9 rounded-lg bg-stone-100 animate-pulse" />}>
                  <SearchBar />
                </Suspense>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {links.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors text-[14px] font-medium">
                    <Icon className="h-[15px] w-[15px] text-stone-400 shrink-0" />
                    {label}
                  </Link>
                ))}
              </nav>

              {/* WhatsApp CTA */}
              <div className="px-4 pb-3">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full rounded-xl bg-[#25D366] hover:bg-[#20bc5a] px-4 py-3 transition-colors">
                  <MessageCircle className="h-4 w-4 text-white shrink-0" />
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
                    <LogOut className="h-[14px] w-[14px]" />
                    Sign out
                  </button>
                </form>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
