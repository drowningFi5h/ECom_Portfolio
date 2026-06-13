'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createProduct, updateProduct } from './actions';
import { uploadProductImage, toSlug, formatPrice } from '@/lib/store';
import type { Product, ProductVariant, ProductInsert } from '@/lib/store';

interface Props {
  product?: Product & { product_variants: ProductVariant[] };
}

const CATEGORIES = ['eCommerce', 'Digital Engineering', 'Media & Design', 'Digital Marketing', 'Social Commerce', 'Amazon', 'Other'];

export default function ProductForm({ product }: Props) {
  const isEdit = !!product;

  const [name,         setName]         = useState(product?.name         ?? '');
  const [slug,         setSlug]         = useState(product?.slug         ?? '');
  const [description,  setDescription]  = useState(product?.description  ?? '');
  const [price,        setPrice]        = useState(product ? (product.price / 100).toFixed(2) : '');
  const [comparePrice, setComparePrice] = useState(product?.compare_price ? (product.compare_price / 100).toFixed(2) : '');
  const [stock,        setStock]        = useState(String(product?.stock ?? 0));
  const [sku,          setSku]          = useState(product?.sku          ?? '');
  const [category,     setCategory]     = useState(product?.category     ?? '');
  const [active,       setActive]       = useState(product?.active       ?? true);
  const [images,       setImages]       = useState<string[]>(product?.images ?? []);
  const [slugManual,   setSlugManual]   = useState(isEdit);

  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState('');
  const [isPending,  startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(toSlug(val));
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const urls = await Promise.all(Array.from(files).map(uploadProductImage));
      setImages(prev => [...prev, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage(url: string) {
    setImages(prev => prev.filter(u => u !== url));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const data: ProductInsert = {
      name:          name.trim(),
      slug:          slug.trim(),
      description:   description.trim() || null,
      price:         Math.round(parseFloat(price) * 100),
      compare_price: comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null,
      stock:         parseInt(stock, 10),
      sku:           sku.trim() || null,
      category:      category || null,
      images,
      active,
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProduct(product.id, data);
        } else {
          await createProduct(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Basic info ────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-5">Basic information</h2>
        <div className="grid gap-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Product name *</label>
              <input value={name} onChange={e => handleNameChange(e.target.value)}
                required placeholder="e.g. Amazon Listing Pack"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug *</label>
              <input value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                required placeholder="amazon-listing-pack"
                className={inputCls} />
              <p className="mt-1 text-xs text-slate-400">Auto-generated from name. URL: /store/<em>{slug || '…'}</em></p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={4} placeholder="What does this product include?"
              className={inputCls + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <label className={labelCls}>Price (₹) *</label>
              <input value={price} onChange={e => setPrice(e.target.value)}
                required type="number" min="0" step="0.01" placeholder="0.00"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Compare price (₹)</label>
              <input value={comparePrice} onChange={e => setComparePrice(e.target.value)}
                type="number" min="0" step="0.01" placeholder="0.00"
                className={inputCls} />
              <p className="mt-1 text-xs text-slate-400">Shown as crossed-out price</p>
            </div>
            <div>
              <label className={labelCls}>Stock *</label>
              <input value={stock} onChange={e => setStock(e.target.value)}
                required type="number" min="0" step="1"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>SKU</label>
              <input value={sku} onChange={e => setSku(e.target.value)}
                placeholder="RBS-001"
                className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option value="">— Select category —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setActive(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {active ? 'Active — visible in store' : 'Inactive — hidden from store'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ── Images ───────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-5">Images</h2>

        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((url, i) => (
            <div key={url} className="relative group w-24 h-24">
              <Image src={url} alt={`Product image ${i + 1}`} fill
                className="object-cover rounded-xl border border-slate-200" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-slate-900/70 text-white px-1.5 py-0.5 rounded">
                  Main
                </span>
              )}
              <button type="button" onClick={() => removeImage(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-xs">{uploading ? 'Uploading…' : 'Add image'}</span>
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => handleImageFiles(e.target.files)} />
        <p className="text-xs text-slate-400">First image is used as the main product image. JPG, PNG, WebP.</p>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex items-center justify-between">
        {isEdit && price && (
          <p className="text-sm text-slate-500">
            Selling at <strong className="text-slate-900">{formatPrice(Math.round(parseFloat(price) * 100))}</strong>
            {comparePrice && <> · was <span className="line-through">{formatPrice(Math.round(parseFloat(comparePrice) * 100))}</span></>}
          </p>
        )}
        <div className="flex gap-3 ml-auto">
          <Button type="submit" disabled={isPending || uploading}>
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</> : (isEdit ? 'Save changes' : 'Create product')}
          </Button>
        </div>
      </div>

    </form>
  );
}
