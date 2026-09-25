// app/auth/confirm/route.ts
// Verifies invite/magic-link tokens from Supabase emails, then redirects.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type      = searchParams.get("type") as "invite" | "signup" | "recovery" | "email" | null;
  const next      = searchParams.get("next") ?? "/first-login";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/first-login?error=invalid", origin));
}
