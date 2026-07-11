'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Package, ShoppingBag, ClipboardList, Bot, Factory, Shield, ArrowRightLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Inbox, Package, ShoppingBag, ClipboardList, Bot, Factory, Shield,
};

export interface NavLink {
  href:  string;
  label: string;
  icon:  string;
}

const AMAZON_PREFIXES = ['/management/amazon', '/management/manufacturer', '/management/admin'];

function isAmazon(href: string) {
  return AMAZON_PREFIXES.some(p => href === p || href.startsWith(p + '/'));
}

export default function ManagementNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  const panel = isAmazon(pathname) ? 'amazon' : 'rbs';

  const rbsLinks    = links.filter(l => !isAmazon(l.href));
  const amazonLinks = links.filter(l =>  isAmazon(l.href));
  const visibleLinks = panel === 'amazon' ? amazonLinks : rbsLinks;

  const switchTarget = panel === 'amazon'
    ? (rbsLinks[0]?.href ?? null)
    : (amazonLinks[0]?.href ?? null);

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Panel label */}
      <span className="text-sm font-bold tracking-tight shrink-0 text-slate-900">
        {panel === 'amazon' ? 'Amazon' : 'RBS Store'}
      </span>

      <span className="text-slate-200 shrink-0">|</span>

      {/* Nav links for current panel */}
      <nav className="flex items-center gap-0.5 overflow-x-auto">
        {visibleLinks.map(({ href, label, icon }) => {
          const Icon   = ICONS[icon] ?? Inbox;
          const exact  = href === '/management';
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Panel switcher */}
      {switchTarget && (
        <Link href={switchTarget}
          className="ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0 border border-slate-200">
          <ArrowRightLeft className="h-3 w-3" />
          {panel === 'amazon' ? 'RBS Store' : 'Amazon'}
        </Link>
      )}
    </div>
  );
}
