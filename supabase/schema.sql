-- Run this in Supabase SQL Editor.
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  english_name text not null default '',
  department text not null default '其他',
  title text not null default '',
  extension text not null default '',
  direct_phone text not null default '',
  location text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "Anyone can read contacts"
on public.contacts for select
to anon, authenticated
using (true);

create policy "Authenticated admins can insert contacts"
on public.contacts for insert
to authenticated
with check (true);

create policy "Authenticated admins can update contacts"
on public.contacts for update
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can delete contacts"
on public.contacts for delete
to authenticated
using (true);

-- IMPORTANT:
-- For production, create admin users manually in Supabase Authentication.
-- Keep public sign-ups disabled. Only trusted administrators should receive accounts.
