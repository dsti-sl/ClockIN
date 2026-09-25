// app/api/mdas/options/route.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  );

  const { data, error } = await admin
    .from("mdas")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mdas: data });
}