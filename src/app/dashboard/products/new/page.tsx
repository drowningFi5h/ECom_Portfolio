import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ProductForm from '../ProductForm';

export default function NewProductPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Products
      </Link>
      <h1 className="text-xl font-bold text-slate-900 mb-6">New product</h1>
      <ProductForm />
    </div>
  );
}
