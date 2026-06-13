import Link from 'next/link';
import { Plus } from 'lucide-react';
import { adminGetAllProducts } from '@/lib/store';
import { Button } from '@/components/ui/button';
import ProductsTable from './ProductsTable';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const { data: products, error } = await adminGetAllProducts();

  if (error) {
    return <div className="p-8 text-red-600">Failed to load products: {error.message}</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products?.length ?? 0} total</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4" />
            New product
          </Link>
        </Button>
      </div>
      <ProductsTable products={products ?? []} />
    </div>
  );
}
