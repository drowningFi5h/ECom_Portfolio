'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import {
  adminUpsertCartItem,
  adminUpdateCartItemQuantity,
  adminRemoveCartItem,
  adminClearCart,
} from '@/lib/store';

export async function addToCart(productId: string, variantId: string | null, quantity = 1) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await adminUpsertCartItem(user.id, productId, variantId, quantity);
  if (error) throw new Error(error.message);
  revalidatePath('/store/cart');
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await adminUpdateCartItemQuantity(itemId, quantity);
  if (error) throw new Error(error.message);
  revalidatePath('/store/cart');
}

export async function removeFromCart(itemId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await adminRemoveCartItem(itemId);
  if (error) throw new Error(error.message);
  revalidatePath('/store/cart');
}

export async function emptyCart() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await adminClearCart(user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/store/cart');
}
