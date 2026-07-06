import { createAdminClient } from '@/lib/store/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AmazonOrder {
  amazon_order_id: string;
  status: string;
  purchase_date: string;
  last_update_date: string;
  order_total_amount: number | null;
  order_total_currency: string | null;
  num_items_shipped: number;
  num_items_unshipped: number;
  fulfillment_channel: string | null;  // AFN = FBA, MFN = FBM
  sales_channel: string | null;
  ship_service_level: string | null;
  buyer_name: string | null;
  ship_city: string | null;
  ship_state: string | null;
  synced_at: string;
}

export interface AmazonInventoryItem {
  seller_sku: string;
  asin: string | null;
  fnsku: string | null;
  product_name: string | null;
  condition: string | null;
  fulfillable_qty: number;
  inbound_working: number;
  inbound_shipped: number;
  inbound_receiving: number;
  reserved_qty: number;
  unfulfillable_qty: number;
  synced_at: string;
}

export interface AmazonStats {
  revenueToday: number;
  orders7d: number;
  lowStockCount: number;
  pendingShipments: number;
  currency: string;
  lastSynced: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function sevenDaysAgoUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAmazonOrders(limit = 100): Promise<AmazonOrder[]> {
  try {
    const { data, error } = await createAdminClient()
      .from('amazon_orders')
      .select('*')
      .order('purchase_date', { ascending: false })
      .limit(limit)
      .returns<AmazonOrder[]>();

    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getRecentAmazonOrders(limit = 8): Promise<AmazonOrder[]> {
  try {
    const { data, error } = await createAdminClient()
      .from('amazon_orders')
      .select('*')
      .order('purchase_date', { ascending: false })
      .limit(limit)
      .returns<AmazonOrder[]>();

    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAmazonInventory(): Promise<AmazonInventoryItem[]> {
  try {
    const { data, error } = await createAdminClient()
      .from('amazon_inventory')
      .select('*')
      .order('fulfillable_qty', { ascending: true })
      .returns<AmazonInventoryItem[]>();

    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAmazonStats(lowStockThreshold = 10): Promise<AmazonStats> {
  const admin = createAdminClient();

  try {
    const [ordersToday, orders7d, inventory] = await Promise.all([
      admin
        .from('amazon_orders')
        .select('order_total_amount, order_total_currency')
        .gte('purchase_date', todayUTC()),
      admin
        .from('amazon_orders')
        .select('amazon_order_id, status, num_items_unshipped')
        .gte('purchase_date', sevenDaysAgoUTC()),
      admin
        .from('amazon_inventory')
        .select('seller_sku, fulfillable_qty, synced_at'),
    ]);

    const todayRows = (ordersToday.data ?? []) as { order_total_amount: number | null; order_total_currency: string | null }[];
    const revenueToday = todayRows.reduce((sum, r) => sum + (r.order_total_amount ?? 0), 0);
    const currency = todayRows[0]?.order_total_currency ?? 'INR';

    const weekRows = (orders7d.data ?? []) as { status: string; num_items_unshipped: number }[];
    const pendingShipments = weekRows.filter(
      r => r.status === 'Pending' || r.num_items_unshipped > 0
    ).length;

    const invRows = (inventory.data ?? []) as { fulfillable_qty: number; synced_at: string }[];
    const lowStockCount = invRows.filter(r => r.fulfillable_qty <= lowStockThreshold).length;

    // Use the most recent order's synced_at — orders sync hourly, inventory only daily
    const latestOrderSync = await admin
      .from('amazon_orders')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1);
    const lastSynced = (latestOrderSync.data?.[0]?.synced_at) ?? invRows[0]?.synced_at ?? null;

    return {
      revenueToday,
      orders7d: weekRows.length,
      lowStockCount,
      pendingShipments,
      currency,
      lastSynced,
    };
  } catch {
    return { revenueToday: 0, orders7d: 0, lowStockCount: 0, pendingShipments: 0, currency: 'INR', lastSynced: null };
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatAmazonPrice(amount: number | null, currency: string | null): string {
  if (amount === null) return '—';
  const curr = currency ?? 'INR';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(amount);
}

export const ORDER_STATUS_STYLES: Record<string, string> = {
  Pending:           'bg-yellow-50 text-yellow-700 border-yellow-200',
  Unshipped:         'bg-orange-50 text-orange-700 border-orange-200',
  PartiallyShipped:  'bg-blue-50  text-blue-700  border-blue-200',
  Shipped:           'bg-purple-50 text-purple-700 border-purple-200',
  Delivered:         'bg-green-50 text-green-700 border-green-200',
  Canceled:          'bg-red-50   text-red-700   border-red-200',
  Unfulfillable:     'bg-stone-100 text-slate-600 border-stone-200',
};
