import { Suspense } from 'react';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import SearchBar from './SearchBar';

const CATEGORIES = [
  'eCommerce',
  'Digital Engineering',
  'Media & Design',
  'Digital Marketing',
  'Social Commerce',
  'Amazon',
];

interface Props {
  category?: string;
  search?:   string;
}

export default function StoreSidebar({ category, search }: Props) {
  function catHref(cat?: string) {
    const p = new URLSearchParams();
    if (cat) p.set('category', cat);
    if (search) p.set('search', search);
    return `/store${p.size ? `?${p}` : ''}`;
  }

  return (
    <div className="sticky top-[78px]">

      {/* Heading */}
      <div className="flex items-center gap-2.5 mb-6">
        <SlidersHorizontal className="h-3.5 w-3.5 text-white/30" />
        <span className="text-[13px] font-semibold text-white/60 tracking-wide">Filters</span>
      </div>

      {/* Search */}
      <div className="mb-7">
        <Suspense fallback={
          <div className="h-9 rounded-xl bg-white/[0.05] border border-white/[0.07] animate-pulse" />
        }>
          <SearchBar />
        </Suspense>
      </div>

      {/* Categories */}
      <div className="mb-7">
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.18em] mb-3">
          Categories
        </p>
        <ul className="space-y-0.5">
          {/* All */}
          <li>
            <Link
              href={catHref()}
              className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all ${
                !category
                  ? 'text-white font-medium'
                  : 'text-white/38 hover:text-white/65 hover:bg-white/[0.04]'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-sm shrink-0 transition-colors ${!category ? 'bg-white' : 'bg-transparent'}`} />
              All services
            </Link>
          </li>
          {CATEGORIES.map(cat => {
            const active = category === cat;
            return (
              <li key={cat}>
                <Link
                  href={catHref(cat)}
                  className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all ${
                    active
                      ? 'text-white font-medium'
                      : 'text-white/38 hover:text-white/65 hover:bg-white/[0.04]'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-sm shrink-0 transition-colors ${active ? 'bg-[#1a9aa0]' : 'bg-transparent'}`} />
                  {cat}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* How to order */}
      <div className="border-t border-white/[0.06] pt-6">
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.18em] mb-4">
          How to order
        </p>
        <ol className="space-y-3.5">
          {[
            ['01', 'Browse & add to your bulk list or request a sample'],
            ['02', 'We confirm pricing & availability within 1–2 days'],
            ['03', 'Pay via NEFT / RTGS — no transaction limits'],
          ].map(([n, text]) => (
            <li key={n} className="flex gap-2.5">
              <span className="text-[11px] font-bold text-[#1a9aa0] shrink-0 mt-[1px]">{n}</span>
              <span className="text-[12px] text-white/35 leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
