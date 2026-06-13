// ── Primitives ────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface ShippingAddress {
  name:     string;
  line1:    string;
  line2?:   string;
  city:     string;
  state:    string;
  pincode:  string;
  country:  string;
}

// ── Database rows ─────────────────────────────────────────────────────────────

export interface Product {
  id:            string;
  created_at:    string;
  updated_at:    string;
  name:          string;
  slug:          string;
  description:   string | null;
  price:         number;           // paise
  compare_price: number | null;    // paise
  stock:         number;
  sku:           string | null;
  category:      string | null;
  images:        string[];
  active:        boolean;
}

export interface ProductVariant {
  id:             string;
  product_id:     string;
  name:           string;
  sku:            string | null;
  price_override: number | null;   // paise, null = use product price
  stock:          number;
  active:         boolean;
  sort_order:     number;
}

export interface CartItem {
  id:         string;
  created_at: string;
  user_id:    string;
  product_id: string;
  variant_id: string | null;
  quantity:   number;
}

export interface Order {
  id:                string;
  created_at:        string;
  updated_at:        string;
  user_id:           string;
  status:            OrderStatus;
  subtotal:          number;       // paise
  total:             number;       // paise
  shipping_address:  ShippingAddress | null;
  stripe_session_id: string | null;
  payment_intent_id: string | null;
  notes:             string | null;
}

export interface OrderItem {
  id:               string;
  order_id:         string;
  product_id:       string;
  variant_id:       string | null;
  quantity:         number;
  unit_price:       number;        // paise
  product_snapshot: ProductSnapshot;
}

// ── Snapshot (product state frozen at purchase time) ─────────────────────────

export interface ProductSnapshot {
  name:         string;
  sku:          string | null;
  image:        string | null;
  variant_name: string | null;
}

// ── Joined / enriched shapes used in UI ──────────────────────────────────────

export interface CartItemFull extends CartItem {
  product: Product;
  variant: ProductVariant | null;
}

export interface OrderFull extends Order {
  items: OrderItemFull[];
}

export interface OrderItemFull extends OrderItem {
  product: Pick<Product, 'id' | 'name' | 'slug' | 'images'>;
  variant: Pick<ProductVariant, 'id' | 'name'> | null;
}

// ── Bulk order requests ───────────────────────────────────────────────────────

export type BulkOrderStatus = 'new' | 'contacted' | 'quoted' | 'closed';
export type BulkOrderType   = 'sample' | 'bulk';

export interface BulkOrderItem {
  product_id:   string;
  product_name: string;
  product_slug: string;
  variant_id:   string | null;
  variant_name: string | null;
  quantity:     number;
  unit_price:   number; // paise
}

export interface BulkOrderRequest {
  id:               string;
  created_at:       string;
  status:           BulkOrderStatus;
  type:             BulkOrderType;
  name:             string;
  email:            string;
  phone:            string | null;
  company:          string | null;
  gst_number:       string | null;
  items:            BulkOrderItem[];
  notes:            string | null;
  total_estimate:   number | null;
  shipping_address: ShippingAddress | null;
  user_id:          string | null;
}

export type BulkOrderRequestInsert = Omit<BulkOrderRequest, 'id' | 'created_at'>;

// ── Insert / update shapes ────────────────────────────────────────────────────

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate  = Partial<ProductInsert>;

export type VariantInsert = Omit<ProductVariant, 'id'>;
export type VariantUpdate  = Partial<VariantInsert>;

export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at'>;
export type OrderItemInsert = Omit<OrderItem, 'id'>;

// ── Utility ───────────────────────────────────────────────────────────────────

/** Convert paise to rupees string e.g. 150000 → "₹1,500.00" */
export function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
  }).format(paise / 100);
}

/** Generate a URL-safe slug from a product name */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Resolve the effective price of a product/variant in paise */
export function effectivePrice(product: Product, variant?: ProductVariant | null): number {
  return variant?.price_override ?? product.price;
}
