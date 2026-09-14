-- supabase/migrations/007_attendee_mda.sql
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Adds the optional MDA (Ministry / Department / Agency) field to attendees
-- so the public attendance form can record which MDA a check‑in belongs to,
-- alongside the mandatory institution field.

alter table public.attendees
  add column if not exists mda text;