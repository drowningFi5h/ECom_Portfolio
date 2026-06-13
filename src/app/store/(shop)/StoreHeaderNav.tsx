'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/store',        label: 'Products',  exact: true  },
  { href: '/store/orders', label: 'My orders', exact: false },
];

export default function StoreHeaderNav({ dark }: { dark?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="hidden sm:flex items-center gap-0.5 flex-1 justify-center">
      {NAV.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`relative text-[13.5px] px-4 py-2 rounded-lg transition-all font-medium tracking-[-0.01em] ${
              active
                ? dark ? 'text-white' : 'text-[#0b3b46]'
                : dark
                  ? 'text-white/55 hover:text-white hover:bg-white/10'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
            }`}>
            {label}
            {active && (
              <span className={`absolute bottom-[3px] left-1/2 -translate-x-1/2 w-3.5 h-[2px] rounded-full ${dark ? 'bg-white' : 'bg-[#0b3b46]'}`} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
