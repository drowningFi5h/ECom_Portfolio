'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { updateCartQuantity, removeFromCart } from './actions';
import { formatPrice, effectivePrice } from '@/lib/store';
import type { CartItemFull } from '@/lib/store';

export default function CartItems({ items }: { items: CartItemFull[] }) {
  const [isPending, startTransition] = useTransition();

  function handleQuantity(itemId: string, quantity: number) {
    startTransition(() => updateCartQuantity(itemId, quantity));
  }
  function handleRemove(itemId: string) {
    startTransition(() => removeFromCart(itemId));
  }

  return (
    <div className="space-y-3 relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
          <Loader2 className="h-5 w-5 animate-spin text-[#0b3b46]" />
        </div>
      )}
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const price = effectivePrice(item.product, item.variant);
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              className="flex gap-4 bg-white rounded-2xl border border-stone-200 p-4"
            >
              <Link href={`/store/${item.product.slug}`}
                className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                {item.product.images[0] ? (
                  <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl select-none">📦</div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/store/${item.product.slug}`}
                  className="font-semibold text-slate-900 text-sm hover:text-[#0b3b46] transition-colors line-clamp-1">
                  {item.product.name}
                </Link>
                {item.variant && (
                  <p className="text-xs text-stone-400 mt-0.5">{item.variant.name}</p>
                )}
                <p className="text-sm font-bold text-[#0b3b46] mt-1">{formatPrice(price)}</p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                    <button onClick={() => handleQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-stone-500 hover:bg-stone-100 transition-colors text-base leading-none">-</button>
                    <span className="px-3 py-1 text-sm font-semibold text-slate-900">{item.quantity}</span>
                    <button onClick={() => handleQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1 text-stone-500 hover:bg-stone-100 transition-colors text-base leading-none">+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{formatPrice(price * item.quantity)}</span>
                    <button onClick={() => handleRemove(item.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
