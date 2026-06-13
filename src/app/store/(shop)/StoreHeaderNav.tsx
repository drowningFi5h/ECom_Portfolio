'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/store',        label: 'Products',  exact: true  },
  { href: '/store/orders', label: 'My orders', exact: false },
];

export default function StoreHeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden sm:flex items-center gap-0.5 flex-1 justify-center">
      {NAV.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`relative text-[13.5px] px-4 py-2 rounded-lg transition-all font-medium tracking-[-0.01em] ${
              active
                ? 'text-[#0b3b46]'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
            }`}>
            {label}
            {active && (
              <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-3.5 h-[2px] bg-[#0b3b46] rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
