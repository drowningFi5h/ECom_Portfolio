-- Run this if you already created the bulk_order_requests table from bulk-orders-schema.sql
alter table public.bulk_order_requests
  add column if not exists type             text not null default 'bulk',      -- 'sample' | 'bulk'
  add column if not exists shipping_address jsonb;
