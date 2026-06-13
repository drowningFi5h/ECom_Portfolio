import { createBrowserClient, createAdminClient } from './client';
import type { CartItem, CartItemFull } from './types';

// ── Browser (client-side, RLS-enforced) ──────────────────────────────────────

export function getCart(userId: string) {
  return createBrowserClient()
    .from('cart_items')
    .select('*, product:products(*), variant:product_variants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .returns<CartItemFull[]>();
}

// ── Admin (server actions, bypasses RLS) ─────────────────────────────────────

export function adminGetCart(userId: string) {
  return createAdminClient()
    .from('cart_items')
    .select('*, product:products(*), variant:product_variants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .returns<CartItemFull[]>();
}

export async function adminUpsertCartItem(
  userId: string,
  productId: string,
  variantId: string | null,
  quantity = 1,
) {
  const admin = createAdminClient();
  const query = admin
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId);

  const { data: existing } = await (variantId
    ? query.eq('variant_id', variantId)
    : query.is('variant_id', null)
  ).maybeSingle<CartItem>();

  if (existing) {
    return admin
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
  }
  return admin
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, variant_id: variantId, quantity });
}

export function adminUpdateCartItemQuantity(itemId: string, quantity: number) {
  if (quantity < 1) return adminRemoveCartItem(itemId);
  return createAdminClient().from('cart_items').update({ quantity }).eq('id', itemId);
}

export function adminRemoveCartItem(itemId: string) {
  return createAdminClient().from('cart_items').delete().eq('id', itemId);
}

export function adminClearCart(userId: string) {
  return createAdminClient().from('cart_items').delete().eq('user_id', userId);
}

// ── Legacy browser helpers (kept for client component use) ───────────────────

export async function upsertCartItem(
  userId: string,
  productId: string,
  variantId: string | null,
  quantity = 1,
) {
  return adminUpsertCartItem(userId, productId, variantId, quantity);
}

export function updateCartItemQuantity(itemId: string, quantity: number) {
  return adminUpdateCartItemQuantity(itemId, quantity);
}

export function removeCartItem(itemId: string) {
  return adminRemoveCartItem(itemId);
}

export function clearCart(userId: string) {
  return adminClearCart(userId);
}
