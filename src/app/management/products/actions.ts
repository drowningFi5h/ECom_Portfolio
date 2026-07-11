'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminCreateVariant,
  adminUpdateVariant,
  adminDeleteVariant,
} from '@/lib/store';
import type { ProductInsert, ProductUpdate, VariantInsert, VariantUpdate } from '@/lib/store';

export async function createProduct(data: ProductInsert) {
  const { data: product, error } = await adminCreateProduct(data);
  if (error || !product) throw new Error(error?.message ?? 'Failed to create product');
  revalidatePath('/management/products');
  redirect(`/management/products/${product.id}`);
}

export async function updateProduct(id: string, data: ProductUpdate) {
  const { error } = await adminUpdateProduct(id, data);
  if (error) throw new Error(error.message);
  revalidatePath('/management/products');
  revalidatePath(`/management/products/${id}`);
}

export async function deleteProduct(id: string) {
  const { error } = await adminDeleteProduct(id);
  if (error) throw new Error(error.message);
  revalidatePath('/management/products');
  redirect('/management/products');
}

export async function toggleProductActive(id: string, active: boolean) {
  const { error } = await adminUpdateProduct(id, { active });
  if (error) throw new Error(error.message);
  revalidatePath('/management/products');
}

export async function createVariant(data: VariantInsert) {
  const { error } = await adminCreateVariant(data);
  if (error) throw new Error(error.message);
  revalidatePath(`/management/products/${data.product_id}`);
}

export async function updateVariant(id: string, productId: string, data: VariantUpdate) {
  const { error } = await adminUpdateVariant(id, data);
  if (error) throw new Error(error.message);
  revalidatePath(`/management/products/${productId}`);
}

export async function deleteVariant(id: string, productId: string) {
  const { error } = await adminDeleteVariant(id);
  if (error) throw new Error(error.message);
  revalidatePath(`/management/products/${productId}`);
}
