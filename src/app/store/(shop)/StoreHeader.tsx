'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ClipboardList, Home } from 'lucide-react';
import CartCount from '../CartCount';
import StoreMobileNav from './StoreMobileNav';
import StoreHeaderNav from './StoreHeaderNav';
import SearchBar from './SearchBar';
import StoreProfileSidebar from './StoreProfileSidebar';

export default function StoreHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Glass background layer — sits behind content, exactly like x.ai */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: scrolled ? 'rgba(250, 250, 248, 0.82)' : 'rgba(250, 250, 248, 0.52)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background 0.2s ease',
        }}
      />
      {/* Bottom hairline — fades in on scroll */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-stone-900/[0.07]"
        style={{ opacity: scrolled ? 1 : 0, transition: 'opacity 0.2s ease' }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[62px] flex items-center gap-3">

        {/* Left: home + logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/"
            title="Back to homepage"
            className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-md hover:bg-stone-100">
            <Home className="h-5 w-5" />
          </Link>
          <div className="w-px h-4 bg-stone-200" />
          <Link href="/store" className="opacity-80 hover:opacity-100 transition-opacity">
            <Image src="/logo-rbs.svg" alt="RBS Store" width={70} height={22} />
          </Link>
        </div>

        {/* Center: nav */}
        <StoreHeaderNav />

        {/* Center-right: search */}
        <Suspense fallback={<div className="hidden sm:block w-48 md:w-60 h-9 rounded-lg bg-stone-100 animate-pulse" />}>
          <SearchBar compact />
        </Suspense>

        {/* Right: bulk list + sign out + mobile */}
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <Link
            href="/store/cart"
            className="relative flex items-center gap-1.5 bg-[#0b3b46] text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg hover:bg-[#0d4a57] active:bg-[#092f38] transition-colors">
            <ClipboardList className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline leading-none">Bulk list</span>
            <CartCount />
          </Link>
          <div className="hidden sm:block">
            <StoreProfileSidebar />
          </div>
          <StoreMobileNav />
        </div>

      </div>
    </header>
  );
}
