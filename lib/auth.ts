// lib/auth.ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "./types";

/** Get the current session + profile. Redirects to /login if not authenticated. */
export async function requireAuth(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?reason=inactive");

  return profile as Profile;
}

/** Get current profile without redirecting */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return data as Profile | null;
}