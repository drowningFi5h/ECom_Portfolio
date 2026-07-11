'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Boxes, Star, Tag, Calculator, TrendingUp, DollarSign, Settings } from 'lucide-react';

const links = [
  { href: '/management/amazon',           label: 'Overview',   icon: LayoutDashboard, exact: true  },
  { href: '/management/amazon/orders',    label: 'Orders',     icon: ShoppingCart,    exact: false },
  { href: '/management/amazon/inventory', label: 'Inventory',  icon: Boxes,           exact: false },
  { href: '/management/amazon/reviews',   label: 'Reviews',    icon: Star,            exact: false },
  { href: '/management/amazon/costs',     label: 'Costs',      icon: Calculator,      exact: false },
  { href: '/management/amazon/pricing',   label: 'Pricing',    icon: DollarSign,      exact: false },
  { href: '/management/amazon/finance',   label: 'Finance',    icon: TrendingUp,      exact: false },
  { href: '/management/amazon/settings',  label: 'Settings',   icon: Settings,        exact: false, soon: true },
];

export default function AmazonNav() {
  const pathname = usePathname();

  return (
    <div style={{ background: 'var(--amz-beige)', borderBottom: '1px solid var(--amz-beige-border)' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <nav className="flex items-center gap-0.5 -mb-px overflow-x-auto">
          {links.map(({ href, label, icon: Icon, exact, soon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={soon ? '#' : href}
                aria-disabled={soon}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${soon ? 'cursor-default opacity-40' : ''}`}
                style={{
                  borderBottomColor: active ? 'var(--amz-teal-dark)' : 'transparent',
                  color: active ? 'var(--amz-teal-dark)' : 'var(--amz-charcoal-soft)',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {soon && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded leading-none"
                    style={{ background: 'var(--amz-beige-border)', color: 'var(--amz-charcoal-soft)' }}>
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
