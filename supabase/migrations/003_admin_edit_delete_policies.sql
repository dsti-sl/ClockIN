-- supabase/migrations/003_admin_edit_delete_policies.sql
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Enables the Edit / Delete buttons:
--   • Events        → UPDATE (edit form, status watcher)  + DELETE (Delete event)
--   • Sessions      → UPDATE (edit session, start/end)    + DELETE
--   • Attendees     → UPDATE (edit attendee)              + DELETE (delete attendee)
--   • qr_tokens     → UPDATE (activate/deactivate on start/end) + DELETE
--   • revival_notes → DELETE
--
-- Rule: a super admin, or the user who created the parent event, may modify/delete.

alter table public.events       enable row level security;
alter table public.sessions     enable row level security;
alter table public.attendees    enable row level security;
alter table public.qr_tokens    enable row level security;
alter table public.revival_notes enable row level security;

-- ── EVENTS ─────────────────────────────────────────────────────
drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update"
on public.events
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or events.created_by = auth.uid()
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or events.created_by = auth.uid()
);

drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete"
on public.events
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or events.created_by = auth.uid()
);

-- ── SESSIONS ───────────────────────────────────────────────────
drop policy if exists "sessions_admin_update" on public.sessions;
create policy "sessions_admin_update"
on public.sessions
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = sessions.event_id
      and e.created_by = auth.uid()
  )
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = sessions.event_id
      and e.created_by = auth.uid()
  )
);

drop policy if exists "sessions_admin_delete" on public.sessions;
create policy "sessions_admin_delete"
on public.sessions
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = sessions.event_id
      and e.created_by = auth.uid()
  )
);

-- ── ATTENDEES ──────────────────────────────────────────────────
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

-- ── QR TOKENS ──────────────────────────────────────────────────
drop policy if exists "qr_tokens_admin_update" on public.qr_tokens;
create policy "qr_tokens_admin_update"
on public.qr_tokens
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = qr_tokens.event_id
      and e.created_by = auth.uid()
  )
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = qr_tokens.event_id
      and e.created_by = auth.uid()
  )
);

drop policy if exists "qr_tokens_admin_delete" on public.qr_tokens;
create policy "qr_tokens_admin_delete"
on public.qr_tokens
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = qr_tokens.event_id
      and e.created_by = auth.uid()
  )
);

-- ── REVIVAL NOTES ──────────────────────────────────────────────
drop policy if exists "revival_notes_admin_delete" on public.revival_notes;
create policy "revival_notes_admin_delete"
on public.revival_notes
for delete
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin)
  or exists (
    select 1 from public.events e
    where e.id = revival_notes.scope_id
      and revival_notes.scope_type = 'event'
      and e.created_by = auth.uid()
  )
  or exists (
    select 1 from public.sessions s
    join public.events e on e.id = s.event_id
    where s.id = revival_notes.scope_id
      and revival_notes.scope_type = 'session'
      and e.created_by = auth.uid()
  )
);
