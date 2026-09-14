-- supabase/migrations/002_attendee_update_delete_policies.sql
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Allows super admins and event creators to UPDATE and DELETE attendees
-- of their own events. Insert/Select policies already exist.

alter table public.attendees enable row level security;

-- UPDATE: super admins or the creator of the event the attendee belongs to
drop policy if exists "attendees_admin_update" on public.attendees;
create policy "attendees_admin_update"
on public.attendees
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and e.created_by = auth.uid()
  )
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and e.created_by = auth.uid()
  )
);

-- DELETE: super admins or the creator of the event the attendee belongs to
drop policy if exists "attendees_admin_delete" on public.attendees;
create policy "attendees_admin_delete"
on public.attendees
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and e.created_by = auth.uid()
  )
);
