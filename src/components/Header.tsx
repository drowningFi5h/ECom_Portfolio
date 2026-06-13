'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { navItems } from '@/lib/data';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="site-header" data-scrolled={scrolled ? '' : undefined}>
      <a className="brand" href="#top" aria-label="Rahul Business Services home">
        <Image className="brand-logo" src="/logo-rbs.svg" alt="Rahul Business Services" width={200} height={66} />
        <span className="brand-name">
          <span>Rahul</span>
          <span>Business</span>
          <span>Services</span>
        </span>
      </a>
      <nav className="main-nav" aria-label="Primary navigation">
        {navItems.map((item) =>
          item.href ? (
            <a key={item.label} href={item.href}>{item.label}</a>
          ) : (
            <span key={item.label}>{item.label}</span>
          )
        )}
      </nav>
      <a className="header-cta" href="#contact">Get Support</a>
    </header>
  );
}
