-- supabase/migrations/008_attendee_email_optional.sql
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Email is optional on every attendee form (public check-in, admin manual
-- entry, admin edit). The forms and APIs store NULL when it is left blank,
-- so the column must accept NULL. Safe to re-run: dropping NOT NULL on a
-- column that is already nullable is a no-op.

alter table public.attendees
  alter column email drop not null;
