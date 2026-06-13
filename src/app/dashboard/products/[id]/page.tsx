import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { adminGetProductById } from '@/lib/store';
import ProductForm from '../ProductForm';
import VariantsManager from '../VariantsManager';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: product, error } = await adminGetProductById(id);

  if (error || !product) notFound();

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Products
      </Link>
      <h1 className="text-xl font-bold text-slate-900 mb-6">Edit product</h1>

      <div className="space-y-6">
        <ProductForm product={product} />
        <VariantsManager productId={product.id} variants={product.product_variants} />
      </div>
    </div>
  );
}
