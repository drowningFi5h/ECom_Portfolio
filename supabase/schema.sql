-- Run this in your Supabase SQL editor (https://supabase.com/dashboard → SQL Editor)

create table if not exists public.submissions (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  name        text        not null,
  email       text        not null,
  service     text        not null,
  message     text        not null,
  status      text        not null    default 'new'
                          check (status in ('new', 'read', 'archived'))
);

-- Disable RLS so the publishable key can read/write.
-- For production, re-enable RLS and use the service-role key in server routes.
alter table public.submissions disable row level security;
