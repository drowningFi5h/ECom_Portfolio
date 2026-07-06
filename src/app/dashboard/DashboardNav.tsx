'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Package, ShoppingBag, ClipboardList, Bot } from 'lucide-react';

const links = [
  { href: '/dashboard',               label: 'Submissions',  icon: Inbox          },
  { href: '/dashboard/products',      label: 'Products',     icon: Package        },
  { href: '/dashboard/orders',        label: 'Orders',       icon: ShoppingBag    },
  { href: '/dashboard/bulk-orders',   label: 'Bulk Orders',  icon: ClipboardList  },
  { href: '/dashboard/amazon',        label: 'Amazon',       icon: Bot            },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
