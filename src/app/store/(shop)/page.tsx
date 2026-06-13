import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getActiveProducts } from '@/lib/store';
import ProductGrid from './ProductGrid';
import HeroCarousel from './HeroCarousel';
import { CATEGORY_THEMES } from './storeThemes';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  'eCommerce',
  'Digital Engineering',
  'Media & Design',
  'Digital Marketing',
  'Social Commerce',
  'Amazon',
];

const PER_PAGE = 40;

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const { category, search, page: pageParam } = await searchParams;
  const { data: products } = await getActiveProducts(category, search);
  const all = products ?? [];
  const hasFilter = !!(category || search);

  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page       = Math.min(Math.max(1, parseInt(pageParam ?? '1', 10) || 1), totalPages);
  const paged      = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const theme = category ? CATEGORY_THEMES[category] ?? null : null;

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search)   params.set('search', search);
    if (p > 1)    params.set('page', String(p));
    const qs = params.toString();
    return `/store${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">

      {/* ── Hero Carousel ── */}
      <HeroCarousel />

      {/* ── Category pills ── */}
      <div className="flex flex-wrap gap-2 mb-2">
        {/* "All" pill — active when no category is selected */}
        <Link
          href={search ? `/store?search=${encodeURIComponent(search)}` : '/store'}
          className={`h-8 px-4 inline-flex items-center rounded-full text-[13px] font-medium transition-all duration-150 ${
            !category
              ? 'bg-[#0b3b46] text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'
          }`}>
          All
        </Link>

        {CATEGORIES.map(c => {
          const href = search
            ? `/store?category=${encodeURIComponent(c)}&search=${encodeURIComponent(search)}`
            : `/store?category=${encodeURIComponent(c)}`;
          const isActive = category === c;
          const pillTheme = CATEGORY_THEMES[c];
          return (
            <Link key={c} href={href}
              className={`h-8 px-4 inline-flex items-center rounded-full text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'shadow-sm text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'
              }`}
              style={isActive && pillTheme ? { background: pillTheme.bg } : undefined}>
              {c}
            </Link>
          );
        })}
      </div>

      {/* ── Meta row ── */}
      <div className="flex items-center justify-between h-10 mb-5">
        <p className="text-[12.5px] text-stone-400 font-medium">
          {all.length} {all.length === 1 ? 'service' : 'services'}
          {category ? ` · ${category}` : ''}
          {search ? ` · "${search}"` : ''}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
        </p>
        {hasFilter && (
          <Link
            href="/store"
            className="text-[12.5px] font-semibold hover:underline underline-offset-2 transition-all"
            style={{ color: theme?.accent ?? '#0b3b46' }}>
            Clear filters
          </Link>
        )}
      </div>

      {/* ── Grid ── */}
      <ProductGrid products={paged} query={search} />

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page === 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium border transition-colors ${
              page === 1
                ? 'pointer-events-none opacity-30 border-stone-200 text-stone-400 bg-white'
                : 'border-stone-200 text-stone-600 bg-white hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
            }`}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Link>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`e${idx}`} className="px-1 text-stone-300 text-[13px] select-none">…</span>
              ) : (
                <Link
                  key={item}
                  href={pageHref(item)}
                  className={`h-9 w-9 flex items-center justify-center rounded-xl text-[13px] font-medium border transition-colors ${
                    item === page
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                  style={item === page ? { background: theme?.bg ?? '#0b3b46', borderColor: 'transparent' } : undefined}>
                  {item}
                </Link>
              )
            )}

          <Link
            href={pageHref(page + 1)}
            aria-disabled={page === totalPages}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium border transition-colors ${
              page === totalPages
                ? 'pointer-events-none opacity-30 border-stone-200 text-stone-400 bg-white'
                : 'border-stone-200 text-stone-600 bg-white hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
            }`}>
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

    </div>
  );
}
