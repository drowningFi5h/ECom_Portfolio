import Link from 'next/link';
import Image from 'next/image';
import { Home, Mail, ClipboardList, Package, Receipt } from 'lucide-react';

export default function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0b3b46] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="bg-white/10 rounded-xl px-4 py-2.5 inline-block mb-4">
              <Image src="/logo-rbs.svg" alt="Rahul Business Services" width={90} height={30} />
            </div>
            <p className="text-white/45 text-sm leading-relaxed max-w-[200px]">
              Amazon marketplace growth partner for B2B businesses across India.
            </p>
          </div>

          {/* Store */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35 mb-5">Store</p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/store" className="flex items-center gap-2 text-white/55 hover:text-white transition-colors">
                  <Package className="h-3.5 w-3.5 shrink-0" /> Products
                </Link>
              </li>
              <li>
                <Link href="/store/cart" className="flex items-center gap-2 text-white/55 hover:text-white transition-colors">
                  <ClipboardList className="h-3.5 w-3.5 shrink-0" /> Bulk list
                </Link>
              </li>
              <li>
                <Link href="/store/orders" className="flex items-center gap-2 text-white/55 hover:text-white transition-colors">
                  <Receipt className="h-3.5 w-3.5 shrink-0" /> My orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35 mb-5">Company</p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="flex items-center gap-2 text-white/55 hover:text-white transition-colors font-medium">
                  <Home className="h-3.5 w-3.5 shrink-0" /> Back to homepage
                </Link>
              </li>
              <li>
                <a href="/#contact" className="flex items-center gap-2 text-white/55 hover:text-white transition-colors">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> Contact us
                </a>
              </li>
            </ul>
          </div>

          {/* B2B info */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35 mb-5">How it works</p>
            <ol className="space-y-2.5 text-sm text-white/45 leading-relaxed">
              <li className="flex gap-2"><span className="text-[#c78336] font-bold shrink-0">1.</span> Add products to your bulk list or request a sample</li>
              <li className="flex gap-2"><span className="text-[#c78336] font-bold shrink-0">2.</span> We confirm pricing and availability</li>
              <li className="flex gap-2"><span className="text-[#c78336] font-bold shrink-0">3.</span> Pay via NEFT/RTGS — no transaction limits</li>
            </ol>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-white/25">
          <p>&copy; {year} Rahul Business Services. All rights reserved.</p>
          <p>GST registered &middot; B2B wholesale only</p>
        </div>
      </div>
    </footer>
  );
}
