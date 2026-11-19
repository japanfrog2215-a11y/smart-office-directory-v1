alter table public.contacts
add column if not exists remark text;

-- Allow visitors to add shared contacts without signing in.
drop policy if exists "Authenticated admins can insert contacts" on public.contacts;
drop policy if exists "Anyone can insert contacts" on public.contacts;
create policy "Anyone can insert contacts"
on public.contacts for insert
to anon, authenticated
with check (true);
