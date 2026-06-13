import { createAdminClient, createBrowserClient } from './client';
import type { Order, OrderFull, OrderInsert, OrderItemInsert } from './types';

// ── Buyer reads (publishable key + RLS) ──────────────────────────────────────

export function getBuyerOrders(userId: string) {
  return createBrowserClient()
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<Order[]>();
}

export function getBuyerOrderById(orderId: string) {
  return createBrowserClient()
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single<OrderFull>();
}

export function adminGetBuyerOrders(userId: string) {
  return createAdminClient()
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<Order[]>();
}

// ── Admin reads (service-role key) ───────────────────────────────────────────

export function adminGetAllOrders() {
  return createAdminClient()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Order[]>();
}

export function adminGetOrderById(orderId: string) {
  return createAdminClient()
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single<OrderFull>();
}

// ── Order creation (service-role key — called from Stripe webhook) ────────────

export async function createOrder(order: OrderInsert, items: OrderItemInsert[]) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .insert(order)
    .select()
    .single<Order>();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create order');

  const { error: itemsError } = await admin
    .from('order_items')
    .insert(items.map(i => ({ ...i, order_id: data.id })));

  if (itemsError) throw new Error(itemsError.message);

  return data;
}

// ── Status updates (service-role key) ────────────────────────────────────────

export function adminUpdateOrderStatus(orderId: string, status: Order['status']) {
  return createAdminClient()
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single<Order>();
}

export function confirmOrderPaid(stripeSessionId: string, paymentIntentId: string) {
  return createAdminClient()
    .from('orders')
    .update({ status: 'paid', payment_intent_id: paymentIntentId })
    .eq('stripe_session_id', stripeSessionId)
    .select()
    .single<Order>();
}
