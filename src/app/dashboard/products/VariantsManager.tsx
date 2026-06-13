'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createVariant, updateVariant, deleteVariant } from './actions';
import { formatPrice } from '@/lib/store';
import type { ProductVariant } from '@/lib/store';

interface Props {
  productId: string;
  variants:  ProductVariant[];
}

interface VariantRow extends Partial<ProductVariant> {
  editing?: boolean;
}

export default function VariantsManager({ productId, variants }: Props) {
  const [rows,       setRows]       = useState<VariantRow[]>(variants);
  const [adding,     setAdding]     = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newPrice,   setNewPrice]   = useState('');
  const [newStock,   setNewStock]   = useState('0');
  const [newSku,     setNewSku]     = useState('');
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProductVariant>>({});
  const [isPending,  startTransition] = useTransition();

  function startEdit(v: ProductVariant) {
    setEditId(v.id);
    setEditValues({
      name:           v.name,
      price_override: v.price_override,
      stock:          v.stock,
      sku:            v.sku,
    });
  }

  function handleAdd() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createVariant({
        product_id:     productId,
        name:           newName.trim(),
        sku:            newSku.trim() || null,
        price_override: newPrice ? Math.round(parseFloat(newPrice) * 100) : null,
        stock:          parseInt(newStock, 10) || 0,
        active:         true,
        sort_order:     rows.length,
      });
      setAdding(false);
      setNewName(''); setNewPrice(''); setNewStock('0'); setNewSku('');
    });
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      await updateVariant(id, productId, {
        name:           editValues.name,
        sku:            editValues.sku ?? null,
        price_override: editValues.price_override ?? null,
        stock:          editValues.stock ?? 0,
      });
      setEditId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(() => deleteVariant(id, productId));
    setRows(prev => prev.filter(r => r.id !== id));
  }

  const inputCls = 'border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 w-full';

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Variants</h2>
          <p className="text-xs text-slate-400 mt-0.5">e.g. Starter / Pro / Enterprise plans with different pricing</p>
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add variant
          </Button>
        )}
      </div>

      {rows.length === 0 && !adding && (
        <p className="text-sm text-slate-400 text-center py-6">No variants — product has a single price and stock.</p>
      )}

      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-100 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">SKU</th>
                <th className="text-left px-4 py-2.5">Price override</th>
                <th className="text-left px-4 py-2.5">Stock</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} className="border-t border-slate-100">
                  {editId === v.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editValues.name ?? ''} onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editValues.sku ?? ''} onChange={e => setEditValues(p => ({ ...p, sku: e.target.value }))} className={inputCls} placeholder="optional" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="0.01" placeholder="Use product price"
                          value={editValues.price_override != null ? (editValues.price_override / 100).toFixed(2) : ''}
                          onChange={e => setEditValues(p => ({ ...p, price_override: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                          className={inputCls} />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="1" value={editValues.stock ?? 0}
                          onChange={e => setEditValues(p => ({ ...p, stock: parseInt(e.target.value, 10) || 0 }))}
                          className={inputCls} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleUpdate(v.id!)}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                      <td className="px-4 py-3 text-slate-500">{v.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{v.price_override != null ? formatPrice(v.price_override) : <span className="text-slate-400 text-xs">Product price</span>}</td>
                      <td className="px-4 py-3">
                        <span className={v.stock === 0 ? 'text-red-600 font-medium' : 'text-slate-900'}>{v.stock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(v as ProductVariant)}>Edit</Button>
                          <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleDelete(v.id!)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">New variant</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Name *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Pro Plan" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">SKU</label>
              <input value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="optional" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Price override (₹)</label>
              <input type="number" min="0" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Product price" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Stock</label>
              <input type="number" min="0" step="1" value={newStock} onChange={e => setNewStock(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending || !newName.trim()} onClick={handleAdd}>Add</Button>
            <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewName(''); }}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
