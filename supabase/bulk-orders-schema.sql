-- Bulk order requests from store customers
create table if not exists public.bulk_order_requests (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null    default now(),
  status         text        not null    default 'new',   -- new | contacted | quoted | closed
  name           text        not null,
  email          text        not null,
  phone          text,
  company        text,
  gst_number     text,
  items          jsonb       not null    default '[]',    -- BulkOrderItem[]
  notes          text,
  total_estimate integer,                                 -- paise, for reference
  user_id        uuid        references auth.users(id)
);

alter table public.bulk_order_requests disable row level security;

-- index for dashboard listing
create index if not exists bulk_order_requests_created_at_idx
  on public.bulk_order_requests (created_at desc);
