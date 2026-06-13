'use client';

import { useState, useTransition } from 'react';
import { ListPlus, Check, Loader2 } from 'lucide-react';
import { addToCart } from '../cart/actions';
import type { Product, ProductVariant } from '@/lib/store';

interface Props {
  product: Product;
  variants: ProductVariant[];
}

export default function AddToCart({ product, variants }: Props) {
  const activeVariants = variants.filter(v => v.active);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    activeVariants.length > 0 ? activeVariants[0] : null,
  );
  const [quantity,  setQuantity]  = useState(1);
  const [added,     setAdded]     = useState(false);
  const [error,     setError]     = useState('');
  const [isPending, startTransition] = useTransition();

  const maxStock = selectedVariant?.stock ?? product.stock;
  const outOfStock = maxStock === 0;

  function handleAdd() {
    setError('');
    startTransition(async () => {
      try {
        await addToCart(product.id, selectedVariant?.id ?? null, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add to cart');
      }
    });
  }

  return (
    <div className="space-y-4">

      {/* Variant selector */}
      {activeVariants.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Option</p>
          <div className="flex flex-wrap gap-2">
            {activeVariants.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  selectedVariant?.id === v.id
                    ? 'bg-[#0b3b46] text-white border-[#0b3b46]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                {v.name}
                {v.price_override != null && (
                  <span className="ml-1.5 opacity-70 text-xs">
                    ₹{(v.price_override / 100).toLocaleString('en-IN')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quantity</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 transition-colors text-lg leading-none">−</button>
            <span className="px-4 py-2 text-sm font-semibold text-slate-900 min-w-[2.5rem] text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
              disabled={outOfStock}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 transition-colors text-lg leading-none disabled:opacity-30">+</button>
          </div>
          {!outOfStock && (
            <span className="text-xs text-slate-400">{maxStock} in stock</span>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={isPending || outOfStock || added}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
          added
            ? 'bg-green-600 text-white'
            : outOfStock
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-[#0b3b46] text-white hover:bg-[#0d4a57] active:scale-[0.98]'
        }`}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" />
          : added    ? <><Check className="h-4 w-4" /> Added to cart</>
          : outOfStock ? 'Out of stock'
          : <><ListPlus className="h-4 w-4" /> Add to bulk list</>}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
