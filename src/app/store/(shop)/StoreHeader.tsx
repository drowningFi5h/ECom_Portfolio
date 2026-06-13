'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ClipboardList, Home } from 'lucide-react';
import CartCount from '../CartCount';
import StoreMobileNav from './StoreMobileNav';
import StoreHeaderNav from './StoreHeaderNav';
import SearchBar from './SearchBar';
import StoreProfileSidebar from './StoreProfileSidebar';
import { CATEGORY_THEMES } from './storeThemes';

function StoreHeaderInner() {
  const [scrolled, setScrolled] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const category = searchParams.get('category');
  const theme = category ? CATEGORY_THEMES[category] ?? null : null;
  const dark = !!theme;

  const glassBg = theme
    ? scrolled ? `${theme.bg}f0` : `${theme.bg}cc`
    : scrolled ? 'rgba(250,250,248,0.82)' : 'rgba(250,250,248,0.52)';

  return (
    <header className="sticky top-0 z-50">
      {/* Glass background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: glassBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background 0.55s ease',
        }}
      />
      {/* Bottom hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(17,24,39,0.07)',
          opacity: scrolled ? 1 : 0,
          transition: 'opacity 0.2s ease, background 0.55s ease',
        }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[62px] flex items-center gap-3">

        {/* Left: home + logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/"
            title="Back to homepage"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: dark ? 'rgba(255,255,255,0.55)' : undefined }}
            onMouseEnter={e => (e.currentTarget.style.color = dark ? '#fff' : '')}
            onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.55)' : '')}
          >
            <Home className={`h-5 w-5 ${!dark ? 'text-stone-400 hover:text-stone-600' : ''}`} />
          </Link>
          <div className="w-px h-4" style={{ background: dark ? 'rgba(255,255,255,0.2)' : '#e7e5e4' }} />
          <Link href="/store" className="opacity-80 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-rbs.svg"
              alt="RBS Store"
              width={70}
              height={22}
              style={{ filter: dark ? 'brightness(0) invert(1)' : undefined, transition: 'filter 0.4s ease' }}
            />
          </Link>
        </div>

        {/* Center: nav */}
        <StoreHeaderNav dark={dark} />

        {/* Center-right: search */}
        <Suspense fallback={<div className="hidden sm:block w-48 md:w-60 h-9 rounded-lg animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.1)' : '#f5f5f4' }} />}>
          <SearchBar compact dark={dark} />
        </Suspense>

        {/* Right: bulk list + sign out + mobile */}
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <Link
            href="/store/cart"
            className="relative flex items-center gap-1.5 text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-colors"
            style={{
              background: dark ? theme!.accent : '#0b3b46',
              color: dark ? '#000' : '#fff',
            }}>
            <ClipboardList className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline leading-none">Bulk list</span>
            <CartCount />
          </Link>
          <div className="hidden sm:block">
            <StoreProfileSidebar dark={dark} />
          </div>
          <StoreMobileNav dark={dark} />
        </div>

      </div>
    </header>
  );
}

export default function StoreHeader() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 h-[62px]" style={{ background: 'rgba(250,250,248,0.82)', backdropFilter: 'blur(12px)' }} />
    }>
      <StoreHeaderInner />
    </Suspense>
  );
}
