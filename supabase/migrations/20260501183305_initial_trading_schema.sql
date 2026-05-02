create extension if not exists pgcrypto;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  direction text not null check (direction in ('LONG', 'SHORT')),
  day_type text not null check (day_type in ('TYPE 1 LONG', 'TYPE 2 LONG', 'TYPE 1 SHORT', 'TYPE 2 SHORT', 'LUNCH REVERSAL', 'DISTRIBUTION', 'NO TRADE')),
  entry_price numeric not null,
  exit_price numeric,
  stop_price numeric not null,
  target_price numeric not null,
  contracts integer not null default 1 check (contracts > 0),
  pnl numeric,
  status text not null check (status in ('OPEN', 'CLOSED', 'CANCELLED', 'EXECUTED', 'MISSED', 'SUCCESSFUL', 'FAILED')),
  exit_reason text check (exit_reason is null or exit_reason in ('TARGET', 'STOP', 'HARD EXIT', 'MANUAL')),
  manual_outcome text check (manual_outcome is null or manual_outcome in ('SUCCESS', 'FAILED')),
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
  image_url text not null,
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
for each row execute function public.set_updated_at();

drop trigger if exists set_setups_updated_at on public.setups;
create trigger set_setups_updated_at
before update on public.setups
for each row execute function public.set_updated_at();

alter table public.trades enable row level security;
alter table public.setups enable row level security;

create policy "trades_select_own" on public.trades
for select to authenticated
using (auth.uid() = user_id);

create policy "trades_insert_own" on public.trades
for insert to authenticated
with check (auth.uid() = user_id);

create policy "trades_update_own" on public.trades
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "trades_delete_own" on public.trades
for delete to authenticated
using (auth.uid() = user_id);

create policy "setups_select_own" on public.setups
for select to authenticated
using (auth.uid() = user_id);

create policy "setups_insert_own" on public.setups
for insert to authenticated
with check (auth.uid() = user_id);

create policy "setups_update_own" on public.setups
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "setups_delete_own" on public.setups
for delete to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "screenshots_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "screenshots_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "screenshots_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "screenshots_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create index if not exists trades_user_timestamp_idx on public.trades (user_id, timestamp desc);
create index if not exists setups_user_created_at_idx on public.setups (user_id, created_at desc);
