import { createAdminClient } from './client';
import type { BulkOrderRequest, BulkOrderRequestInsert, BulkOrderStatus } from './types';

export function adminGetAllBulkOrders() {
  return createAdminClient()
    .from('bulk_order_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<BulkOrderRequest[]>();
}

export function adminGetBulkOrderById(id: string) {
  return createAdminClient()
    .from('bulk_order_requests')
    .select('*')
    .eq('id', id)
    .single<BulkOrderRequest>();
}

export function adminInsertBulkOrder(data: BulkOrderRequestInsert) {
  return createAdminClient()
    .from('bulk_order_requests')
    .insert(data)
    .select()
    .single<BulkOrderRequest>();
}

export function adminUpdateBulkOrderStatus(id: string, status: BulkOrderStatus) {
  return createAdminClient()
    .from('bulk_order_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single<BulkOrderRequest>();
}
