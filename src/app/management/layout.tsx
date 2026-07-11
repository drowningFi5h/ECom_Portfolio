import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/management-session';
import ManagementNav, { type NavLink } from './ManagementNav';

export const metadata: Metadata = { title: 'Management · Rahul Business Services' };

const ALL_NAV_LINKS: NavLink[] = [
  { href: '/management',                   label: 'Submissions',  icon: 'Inbox'         },
  { href: '/management/products',          label: 'Products',     icon: 'Package'       },
  { href: '/management/orders',            label: 'Orders',       icon: 'ShoppingBag'   },
  { href: '/management/bulk-orders',       label: 'Bulk Orders',  icon: 'ClipboardList' },
  { href: '/management/amazon',            label: 'Amazon',       icon: 'Bot'           },
  { href: '/management/manufacturer',      label: 'Manufacturer', icon: 'Factory'       },
  { href: '/management/admin/credentials', label: 'Admin',        icon: 'Shield'        },
];

function isLinkAllowed(href: string, allowedPaths: string[]): boolean {
  return allowedPaths.some(p => href === p || href.startsWith(p + '/'));
}

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const secret      = process.env.DASHBOARD_SESSION_SECRET ?? '';

  // Admin: full access via hardcoded session
  const adminCookie = cookieStore.get('dash_session')?.value;
  const isAdmin     = !!adminCookie && adminCookie === secret;

  let displayName = 'Admin';
  let navLinks    = ALL_NAV_LINKS;

  if (!isAdmin) {
    const roleCookie = cookieStore.get('mgmt_session')?.value;
    if (roleCookie) {
      const payload = await verifySession(roleCookie, secret);
      if (payload) {
        displayName = payload.displayName;
        navLinks    = ALL_NAV_LINKS.filter(l => isLinkAllowed(l.href, payload.allowedPaths));
      } else {
        navLinks = [];
      }
    } else {
      navLinks = [];
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 md:px-8 h-14 max-w-7xl mx-auto">
          <div className="flex items-center min-w-0">
            <ManagementNav links={navLinks} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400 hidden sm:block">{displayName}</span>
            <form action="/api/management/logout" method="POST">
              <button type="submit" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
