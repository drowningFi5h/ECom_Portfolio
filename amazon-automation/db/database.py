"""
Supabase client for the Python automation backend.

All modules use get_supabase() to read/write data.
The same Supabase project is used by the Next.js frontend,
so Amazon data is instantly visible in the web dashboard.
"""

from functools import lru_cache
from supabase import create_client, Client
from config import supabase_cfg


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached Supabase client using the service-role key."""
    return create_client(supabase_cfg.url, supabase_cfg.service_role_key)


# ── Schema helpers ─────────────────────────────────────────────────────────────
# Run these SQL statements in Supabase SQL editor to create the required tables.
# They're kept here so everything stays in one place.

SCHEMA_SQL = """
-- Amazon orders
CREATE TABLE IF NOT EXISTS amazon_orders (
    amazon_order_id   TEXT PRIMARY KEY,
    status            TEXT,
    purchase_date     TIMESTAMPTZ,
    last_update_date  TIMESTAMPTZ,
    order_total_amount NUMERIC,
    order_total_currency TEXT,
    num_items_shipped  INT,
    num_items_unshipped INT,
    fulfillment_channel TEXT,   -- AFN = FBA, MFN = FBM
    sales_channel     TEXT,
    ship_service_level TEXT,
    buyer_name        TEXT,
    ship_city         TEXT,
    ship_state        TEXT,
    ship_postal_code  TEXT,
    raw               JSONB,    -- full SP-API payload for future use
    synced_at         TIMESTAMPTZ DEFAULT now()
);

-- Amazon order line items
CREATE TABLE IF NOT EXISTS amazon_order_items (
    id                BIGSERIAL PRIMARY KEY,
    amazon_order_id   TEXT REFERENCES amazon_orders(amazon_order_id) ON DELETE CASCADE,
    asin              TEXT,
    seller_sku        TEXT,
    title             TEXT,
    quantity_ordered  INT,
    quantity_shipped  INT,
    item_price_amount NUMERIC,
    item_price_currency TEXT,
    raw               JSONB
);

-- Inventory snapshot — FBM: merchant listing quantities; FBA: warehouse stock
CREATE TABLE IF NOT EXISTS amazon_inventory (
    seller_sku        TEXT PRIMARY KEY,
    asin              TEXT,
    fnsku             TEXT,
    product_name      TEXT,
    condition         TEXT,
    fulfillable_qty   INT,
    listing_price     NUMERIC,      -- FBM listing price
    listing_status    TEXT,         -- FBM: active / inactive / incomplete
    inbound_working   INT,
    inbound_shipped   INT,
    inbound_receiving INT,
    reserved_qty      INT,
    researching_qty   INT,
    unfulfillable_qty INT,
    synced_at         TIMESTAMPTZ DEFAULT now()
);

-- Migration: run this if the table already exists without the new columns
-- ALTER TABLE amazon_inventory ADD COLUMN IF NOT EXISTS listing_price NUMERIC;
-- ALTER TABLE amazon_inventory ADD COLUMN IF NOT EXISTS listing_status TEXT;

-- Alert log (so we don't spam the same alert repeatedly)
CREATE TABLE IF NOT EXISTS amazon_alert_log (
    id          BIGSERIAL PRIMARY KEY,
    alert_type  TEXT,   -- 'low_stock', 'review_request', etc.
    reference   TEXT,   -- SKU, order ID, etc.
    sent_at     TIMESTAMPTZ DEFAULT now()
);

-- Pricing rules for the dynamic repricer (one row per SKU you want to manage)
CREATE TABLE IF NOT EXISTS amazon_pricing_rules (
    seller_sku   TEXT PRIMARY KEY,
    min_price    NUMERIC NOT NULL,
    max_price    NUMERIC NOT NULL,
    strategy     TEXT    NOT NULL DEFAULT 'match_competitive',
    undercut_by  NUMERIC DEFAULT 2,
    margin_pct   NUMERIC DEFAULT 20,
    cost_price   NUMERIC,
    enabled      BOOL    DEFAULT true,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Repricer output — suggested prices for review before applying
CREATE TABLE IF NOT EXISTS amazon_price_suggestions (
    seller_sku        TEXT PRIMARY KEY,
    current_price     NUMERIC,
    competitive_price NUMERIC,
    suggested_price   NUMERIC,
    strategy          TEXT,
    reason            TEXT,
    generated_at      TIMESTAMPTZ DEFAULT now(),
    applied           BOOL DEFAULT false
);

-- Settlement groups — one row per 14-day Amazon payout cycle
-- service_fees / adjustments / other_amount are non-order event totals
-- that explain how total_amount was reached (reconciliation)
CREATE TABLE IF NOT EXISTS amazon_settlements (
    group_id             TEXT PRIMARY KEY,
    processing_status    TEXT,
    fund_transfer_status TEXT,
    period_start         TIMESTAMPTZ,
    period_end           TIMESTAMPTZ,
    fund_transfer_date   TIMESTAMPTZ,
    total_amount         NUMERIC,
    currency             TEXT DEFAULT 'INR',
    service_fees         NUMERIC DEFAULT 0,   -- subscription, storage, placement fees
    adjustments          NUMERIC DEFAULT 0,   -- FBA reimbursements, SAFE-T, corrections
    other_amount         NUMERIC DEFAULT 0,   -- chargebacks, debt recovery, coupons
    synced_at            TIMESTAMPTZ DEFAULT now()
);

-- Migration if table already exists:
-- ALTER TABLE amazon_settlements ADD COLUMN IF NOT EXISTS service_fees  NUMERIC DEFAULT 0;
-- ALTER TABLE amazon_settlements ADD COLUMN IF NOT EXISTS adjustments   NUMERIC DEFAULT 0;
-- ALTER TABLE amazon_settlements ADD COLUMN IF NOT EXISTS other_amount  NUMERIC DEFAULT 0;

-- Financial events — per-order, per-SKU revenue and fee breakdown
CREATE TABLE IF NOT EXISTS amazon_financial_events (
    id               BIGSERIAL PRIMARY KEY,
    group_id         TEXT,
    amazon_order_id  TEXT,
    seller_sku       TEXT,
    event_type       TEXT,        -- 'shipment' | 'refund'
    posted_date      TIMESTAMPTZ,
    quantity         INT DEFAULT 1,
    principal        NUMERIC DEFAULT 0,
    shipping_charge  NUMERIC DEFAULT 0,
    referral_fee     NUMERIC DEFAULT 0,
    variable_closing NUMERIC DEFAULT 0,
    fixed_closing    NUMERIC DEFAULT 0,
    other_fees       NUMERIC DEFAULT 0,
    promotion_amount NUMERIC DEFAULT 0,
    net_amazon       NUMERIC DEFAULT 0,
    synced_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE (group_id, amazon_order_id, seller_sku, event_type)
);

-- Fee estimates from SP-API ProductFees — referral % and closing fee per SKU at listing price
CREATE TABLE IF NOT EXISTS amazon_fee_estimates (
    seller_sku       TEXT PRIMARY KEY,
    listing_price    NUMERIC,
    referral_fee     NUMERIC,
    referral_pct     NUMERIC,   -- effective referral % for this SKU's category
    variable_closing NUMERIC,
    per_item_fee     NUMERIC DEFAULT 0,
    fetched_at       TIMESTAMPTZ DEFAULT now()
);

-- Product cost config — box dimensions (inches), GSM config, rate per kg
-- Dimensions auto-parsed from SKU name (NNNNxNNNNxNNNN ÷ 100 = inches)
-- box_h/b/l are manual overrides for SKUs where name has no dimensions
-- pack_qty: how many boxes are sold in one listing (affects COGS multiplier)
CREATE TABLE IF NOT EXISTS amazon_product_costs (
    seller_sku   TEXT PRIMARY KEY,
    gsm_config   TEXT,        -- '150_3ply' | '150_5ply' | '150_7ply' | '180_3ply' | '180_5ply' | '180_7ply'
    rate_per_kg  NUMERIC DEFAULT 60,
    box_h        NUMERIC,     -- inches override
    box_b        NUMERIC,
    box_l        NUMERIC,
    pack_qty     INT DEFAULT 1, -- units per listing (parsed from title "Pack of N")
    updated_at   TIMESTAMPTZ DEFAULT now()
);
-- Migration if table already exists:
-- ALTER TABLE amazon_product_costs ADD COLUMN IF NOT EXISTS pack_qty INT DEFAULT 1;
"""
