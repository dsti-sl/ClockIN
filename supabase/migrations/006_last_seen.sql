-- supabase/migrations/006_last_seen.sql
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Adds last_seen_at to profiles for the presence heartbeat:
--   • Each logged-in admin's browser pings /api/presence/heartbeat every 60s
--   • UI shows an "Online" badge when the ping is less than 5 minutes old

alter table public.profiles
  add column if not exists last_seen_at timestamptz;
