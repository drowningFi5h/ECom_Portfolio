import { createAdminClient, createBrowserClient } from './client';
import type { Product, ProductVariant, ProductInsert, ProductUpdate, VariantInsert, VariantUpdate } from './types';

// ── Public (store) reads — publishable key ────────────────────────────────────

export function getActiveProducts(category?: string, search?: string) {
  let q = createBrowserClient()
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  if (search)   q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  return q.returns<Product[]>();
}

export function getProductBySlug(slug: string) {
  return createBrowserClient()
    .from('products')
    .select('*, product_variants(*)')
    .eq('slug', slug)
    .eq('active', true)
    .single<Product & { product_variants: ProductVariant[] }>();
}

// ── Admin reads — service-role key ───────────────────────────────────────────

export function adminGetAllProducts() {
  return createAdminClient()
    .from('products')
    .select('*, product_variants(*)')
    .order('created_at', { ascending: false })
    .returns<(Product & { product_variants: ProductVariant[] })[]>();
}

export function adminGetProductById(id: string) {
  return createAdminClient()
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .single<Product & { product_variants: ProductVariant[] }>();
}

// ── Admin writes ──────────────────────────────────────────────────────────────

export function adminCreateProduct(data: ProductInsert) {
  return createAdminClient().from('products').insert(data).select().single<Product>();
}

export function adminUpdateProduct(id: string, data: ProductUpdate) {
  return createAdminClient().from('products').update(data).eq('id', id).select().single<Product>();
}

export function adminDeleteProduct(id: string) {
  return createAdminClient().from('products').delete().eq('id', id);
}

// ── Variant writes ────────────────────────────────────────────────────────────

export function adminCreateVariant(data: VariantInsert) {
  return createAdminClient().from('product_variants').insert(data).select().single<ProductVariant>();
}

export function adminUpdateVariant(id: string, data: VariantUpdate) {
  return createAdminClient().from('product_variants').update(data).eq('id', id).select().single<ProductVariant>();
}

export function adminDeleteVariant(id: string) {
  return createAdminClient().from('product_variants').delete().eq('id', id);
}

// ── Stock helpers ─────────────────────────────────────────────────────────────

/** Decrement stock after a successful order. Runs server-side only. */
export async function decrementStock(
  items: { product_id: string; variant_id: string | null; quantity: number }[],
) {
  const admin = createAdminClient();
  await Promise.all(
    items.map(({ product_id, variant_id, quantity }) => {
      if (variant_id) {
        return admin.rpc('decrement_variant_stock', { v_id: variant_id, qty: quantity });
      }
      return admin.rpc('decrement_product_stock', { p_id: product_id, qty: quantity });
    }),
  );
}
