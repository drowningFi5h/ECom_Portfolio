import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getProductBySlug, formatPrice, effectivePrice } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import AddToCart from './AddToCart';
import SampleRequestModal from './SampleRequestModal';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ data: product, error }, user] = await Promise.all([
    getProductBySlug(slug),
    getCurrentUser(),
  ]);

  if (error || !product) notFound();

  const variants       = product.product_variants ?? [];
  const activeVariants = variants.filter(v => v.active);
  const displayPrice   = effectivePrice(product, activeVariants[0]);

  const defaults = {
    name:          user?.user_metadata?.full_name  ?? '',
    email:         user?.email                     ?? '',
    phone:         user?.user_metadata?.phone      ?? '',
    company:       user?.user_metadata?.company    ?? '',
    gst_number:    user?.user_metadata?.gst_number ?? '',
    address_line1: user?.user_metadata?.address_line1 ?? '',
    address_line2: user?.user_metadata?.address_line2 ?? '',
    city:          user?.user_metadata?.city       ?? '',
    state:         user?.user_metadata?.state      ?? '',
    pincode:       user?.user_metadata?.pincode    ?? '',
    user_id:       user?.id                        ?? '',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/store"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden relative">
            {product.images[0] ? (
              <Image src={product.images[0]} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-200 text-7xl">📦</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((url, i) => (
                <div key={url} className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200">
                  <Image src={url} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <span className="text-xs font-semibold text-[#136f75] uppercase tracking-widest">{product.category}</span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 mb-3 leading-tight">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-[#0b3b46]">{formatPrice(displayPrice)}</span>
            {product.compare_price && (
              <span className="text-lg text-slate-400 line-through">{formatPrice(product.compare_price)}</span>
            )}
            {product.compare_price && product.compare_price > displayPrice && (
              <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                {Math.round((1 - displayPrice / product.compare_price) * 100)}% off
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-line">{product.description}</p>
          )}

          <div className="border-t border-slate-100 pt-6 space-y-3">
            {/* Add to bulk list */}
            <AddToCart product={product} variants={variants} />
            {/* Request a sample */}
            <SampleRequestModal product={product} variants={variants} defaults={defaults} />
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Building a larger order?{' '}
            <Link href="/store/cart" className="text-[#0b3b46] underline underline-offset-2">
              View your bulk list
            </Link>
          </p>

          {product.sku && (
            <p className="text-xs text-slate-400 mt-1">SKU: {product.sku}</p>
          )}
        </div>
      </div>
    </div>
  );
}
