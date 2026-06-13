import type { Metadata } from 'next';
import DashboardNav from './DashboardNav';

export const metadata: Metadata = { title: 'Dashboard · Rahul Business Services' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 md:px-8 h-14 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-900 text-sm tracking-tight">RBS Admin</span>
            <span className="text-slate-200">|</span>
            <DashboardNav />
          </div>
          <form action="/api/dashboard/logout" method="POST">
            <button type="submit" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
