-- ============================================================
-- RBS Store Schema
-- Run in Supabase SQL Editor after store-schema.sql
-- ============================================================

-- ── Products ─────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text        not null,
  slug        text        not null unique,
  description text,
  price       integer     not null check (price >= 0),  -- stored in paise (₹1 = 100)
  compare_price integer   check (compare_price >= 0),   -- original/crossed-out price
  stock       integer     not null default 0 check (stock >= 0),
  sku         text        unique,
  category    text,
  images      text[]      not null default '{}',         -- Supabase Storage URLs
  active      boolean     not null default true
);

-- ── Product variants ─────────────────────────────────────────
-- Use when a product has options (e.g. "Starter / Pro / Enterprise")
create table if not exists public.product_variants (
  id             uuid    primary key default gen_random_uuid(),
  product_id     uuid    not null references public.products(id) on delete cascade,
  name           text    not null,                        -- e.g. "Pro Plan"
  sku            text    unique,
  price_override integer check (price_override >= 0),    -- null = use product price
  stock          integer not null default 0 check (stock >= 0),
  active         boolean not null default true,
  sort_order     integer not null default 0
);

-- ── Cart items ───────────────────────────────────────────────
create table if not exists public.cart_items (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  product_id  uuid        not null references public.products(id) on delete cascade,
  variant_id  uuid        references public.product_variants(id) on delete cascade,
  quantity    integer     not null default 1 check (quantity > 0),
  unique (user_id, product_id, variant_id)
);

-- ── Orders ───────────────────────────────────────────────────
create table if not exists public.orders (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  user_id            uuid        not null references auth.users(id),
  status             text        not null default 'pending'
                                 check (status in (
                                   'pending',    -- awaiting payment
                                   'paid',       -- payment confirmed
                                   'processing', -- being fulfilled
                                   'shipped',    -- dispatched
                                   'delivered',  -- confirmed delivered
                                   'cancelled',
                                   'refunded'
                                 )),
  subtotal           integer     not null check (subtotal >= 0),  -- paise
  total              integer     not null check (total >= 0),     -- paise
  shipping_address   jsonb,      -- { name, line1, line2, city, state, pincode, country }
  stripe_session_id  text        unique,
  payment_intent_id  text        unique,
  notes              text
);

-- ── Order items ──────────────────────────────────────────────
create table if not exists public.order_items (
  id               uuid    primary key default gen_random_uuid(),
  order_id         uuid    not null references public.orders(id) on delete cascade,
  product_id       uuid    not null references public.products(id),
  variant_id       uuid    references public.product_variants(id),
  quantity         integer not null check (quantity > 0),
  unit_price       integer not null check (unit_price >= 0),  -- price at time of purchase (paise)
  product_snapshot jsonb   not null   -- full product name/sku/image frozen at purchase time
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists products_active_idx       on public.products(active);
create index if not exists products_category_idx     on public.products(category);
create index if not exists cart_user_idx             on public.cart_items(user_id);
create index if not exists orders_user_idx           on public.orders(user_id);
create index if not exists orders_status_idx         on public.orders(status);
create index if not exists orders_stripe_session_idx on public.orders(stripe_session_id);

-- ── Auto-update updated_at ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ── Stock decrement RPCs (called server-side after payment) ──
create or replace function public.decrement_product_stock(p_id uuid, qty integer)
returns void language plpgsql security definer as $$
begin
  update public.products set stock = greatest(stock - qty, 0) where id = p_id;
end;
$$;

create or replace function public.decrement_variant_stock(v_id uuid, qty integer)
returns void language plpgsql security definer as $$
begin
  update public.product_variants set stock = greatest(stock - qty, 0) where id = v_id;
end;
$$;

-- ── Row-level security ───────────────────────────────────────
-- Products: public read (active only), writes go through service-role key (server actions)
alter table public.products         disable row level security;
alter table public.product_variants disable row level security;

-- Cart: each user sees and manages only their own items
alter table public.cart_items enable row level security;
create policy "cart_own" on public.cart_items
  for all using (auth.uid() = user_id);

-- Orders: each user sees their own; inserts come through server action (service role)
alter table public.orders enable row level security;
create policy "orders_read_own" on public.orders
  for select using (auth.uid() = user_id);

-- Order items: visible if the parent order belongs to the user
alter table public.order_items enable row level security;
create policy "order_items_read_own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );
