'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { formatPrice, effectivePrice } from '@/lib/store';
import type { Product } from '@/lib/store';

function ProductCard({ p, index }: { p: Product; index: number }) {
  const price    = effectivePrice(p);
  const discount = p.compare_price && p.compare_price > price
    ? Math.round((1 - price / p.compare_price) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <Link
        href={`/store/${p.slug}`}
        className="group flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden
                   hover:border-stone-300 hover:shadow-[0_6px_28px_rgba(11,59,70,0.09)]
                   hover:-translate-y-[3px] transition-all duration-200">

        {/* Image */}
        <div className="relative aspect-[4/3] bg-stone-50 overflow-hidden">
          {p.images[0] ? (
            <Image
              src={p.images[0]} alt={p.name} fill
              className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center select-none">
              <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
                <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
              </div>
            </div>
          )}

          {/* Hover action pill */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3.5
                          opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            <span className="inline-flex items-center gap-1.5 bg-[#0b3b46] text-white text-[12px] font-semibold
                             px-4 py-1.5 rounded-full shadow-md">
              View details <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount && (
              <span className="text-[12px] font-bold bg-emerald-500 text-white px-3 py-0.5 rounded-full shadow-sm">
                -{discount}%
              </span>
            )}
            {p.stock === 0 && (
              <span className="text-[12px] font-semibold bg-stone-800/70 backdrop-blur-sm text-white px-3 py-0.5 rounded-full">
                Out of stock
              </span>
            )}
          </div>

          {/* Category chip */}
          {p.category && (
            <span className="absolute top-3 right-3 text-[12px] font-medium bg-white/90 backdrop-blur-sm
                             text-stone-600 px-3 py-0.5 rounded-full border border-stone-100 shadow-sm
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {p.category}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-stone-900 leading-snug line-clamp-2
                           group-hover:text-[#0b3b46] transition-colors duration-150 flex-1">
              {p.name}
            </h3>
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-bold text-[#0b3b46]">{formatPrice(price)}</p>
              {p.compare_price && p.compare_price > price && (
                <p className="text-[12px] text-stone-400 line-through leading-none mt-0.5">
                  {formatPrice(p.compare_price)}
                </p>
              )}
            </div>
          </div>
          {p.description && (
            <p className="text-[13px] text-stone-400 line-clamp-2 leading-relaxed">
              {p.description}
            </p>
          )}
        </div>

      </Link>
    </motion.div>
  );
}

export default function ProductGrid({ products, query }: { products: Product[]; query?: string }) {
  if (products.length === 0) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-stone-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-stone-700 mb-1">
            {query ? `No results for "${query}"` : 'Nothing here yet'}
          </p>
          <p className="text-[13px] text-stone-400">
            {query ? 'Try a different keyword or clear filters.' : 'Check back soon — new services are added regularly.'}
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
    </div>
  );
}
