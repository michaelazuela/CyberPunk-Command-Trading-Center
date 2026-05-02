create extension if not exists "pgcrypto";

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  direction text not null check (direction in ('LONG', 'SHORT')),
  day_type text not null,
  entry_price numeric not null,
  exit_price numeric,
  stop_price numeric not null,
  target_price numeric not null,
  contracts integer not null,
  pnl numeric,
  status text not null,
  exit_reason text,
  manual_outcome text,
  notes text,
  timestamp bigint not null,
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_type text not null,
  reasoning text,
  confidence numeric,
  image_url text,
  tags text[] not null default '{}',
  suggested_entry numeric,
  suggested_stop numeric,
  suggested_target numeric,
  ocr_text jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at
before update on public.trades
for each row
execute function public.set_updated_at();

drop trigger if exists set_setups_updated_at on public.setups;
create trigger set_setups_updated_at
before update on public.setups
for each row
execute function public.set_updated_at();

alter table public.trades enable row level security;
alter table public.setups enable row level security;

drop policy if exists "Users can read own trades" on public.trades;
create policy "Users can read own trades"
on public.trades
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own trades" on public.trades;
create policy "Users can insert own trades"
on public.trades
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own trades" on public.trades;
create policy "Users can update own trades"
on public.trades
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own trades" on public.trades;
create policy "Users can delete own trades"
on public.trades
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own setups" on public.setups;
create policy "Users can read own setups"
on public.setups
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own setups" on public.setups;
create policy "Users can insert own setups"
on public.setups
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own setups" on public.setups;
create policy "Users can update own setups"
on public.setups
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own setups" on public.setups;
create policy "Users can delete own setups"
on public.setups
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own screenshots" on storage.objects;
create policy "Users can read own screenshots"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own screenshots" on storage.objects;
create policy "Users can upload own screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own screenshots" on storage.objects;
create policy "Users can update own screenshots"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own screenshots" on storage.objects;
create policy "Users can delete own screenshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);
