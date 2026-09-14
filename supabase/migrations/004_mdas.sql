-- supabase/migrations/004_mdas.sql
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Creates the MDAs (Ministries, Departments & Agencies) reference list:
--   • mdas            → the master list, managed by super admins in /mdas
--   • profiles.mda_id → optional link so each admin belongs to an MDA
--
-- Rules:
--   • Any authenticated user may READ mdas (needed for dropdowns elsewhere).
--   • Only super admins may INSERT / UPDATE / DELETE.

-- ── TABLE ──────────────────────────────────────────────────────
create table if not exists public.mdas (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mdas_name_unique_idx on public.mdas (lower(name));

-- ── PROFILES LINK ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists mda_id uuid references public.mdas (id) on delete set null;

-- ── updated_at trigger ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mdas_set_updated_at on public.mdas;
create trigger mdas_set_updated_at
  before update on public.mdas
  for each row execute function public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────
alter table public.mdas enable row level security;

drop policy if exists "mdas_select_authenticated" on public.mdas;
create policy "mdas_select_authenticated"
on public.mdas
for select
to authenticated
using (true);

drop policy if exists "mdas_super_admin_insert" on public.mdas;
create policy "mdas_super_admin_insert"
on public.mdas
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
);

drop policy if exists "mdas_super_admin_update" on public.mdas;
create policy "mdas_super_admin_update"
on public.mdas
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
);

drop policy if exists "mdas_super_admin_delete" on public.mdas;
create policy "mdas_super_admin_delete"
on public.mdas
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
);
