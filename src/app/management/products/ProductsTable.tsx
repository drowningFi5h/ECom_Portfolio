'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toggleProductActive, deleteProduct } from './actions';
import { formatPrice } from '@/lib/store';
import type { Product, ProductVariant } from '@/lib/store';

type ProductWithVariants = Product & { product_variants: ProductVariant[] };

export default function ProductsTable({ products }: { products: ProductWithVariants[] }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startTransition(() => toggleProductActive(id, active));
  }

  function handleDelete(id: string) {
    startTransition(() => deleteProduct(id));
    setConfirming(null);
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
        <p className="text-slate-400 text-sm mb-4">No products yet.</p>
        <Button asChild size="sm">
          <Link href="/management/products/new">Add your first product</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.images[0] ? (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover w-10 h-10 border border-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200" />
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-slate-900 text-sm">{p.name}</p>
                  {p.sku && <p className="text-xs text-slate-400 mt-0.5">SKU: {p.sku}</p>}
                </TableCell>
                <TableCell className="text-sm text-slate-500">{p.category ?? '—'}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-slate-900">{formatPrice(p.price)}</p>
                  {p.compare_price && (
                    <p className="text-xs text-slate-400 line-through">{formatPrice(p.compare_price)}</p>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${
                    p.stock === 0 ? 'text-red-600' : p.stock < 5 ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {p.stock}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {p.product_variants.length > 0 ? p.product_variants.length : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={p.active ? 'read' : 'archived'}>
                    {p.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" title={p.active ? 'Deactivate' : 'Activate'}
                      disabled={isPending} onClick={() => handleToggle(p.id, !p.active)}>
                      {p.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" asChild>
                      <Link href={`/management/products/${p.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" disabled={isPending}
                      onClick={() => setConfirming(p.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirming} onOpenChange={open => !open && setConfirming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>This will permanently delete the product and all its variants.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" size="sm" disabled={isPending}
              onClick={() => confirming && handleDelete(confirming)}>
              Delete
            </Button>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
