// app/api/admins/delete/route.ts
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Gate: caller must be an authenticated super admin (session from cookies)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Admin id is required." }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  // Super admins cannot be deleted (prevents locking out the super admin role)
  const { data: target } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", id)
    .single();

  if (target?.is_super_admin) {
    return NextResponse.json(
      { error: "Super admins cannot be deleted." },
      { status: 400 }
    );
  }

  // Admin client (service role) — server-side only
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  );

  // Deleting the auth user cascades to profiles; events/sessions keep their
  // data with created_by/revived_by set to null (ON DELETE SET NULL).
  const { error: deleteError } = await admin.auth.admin.deleteUser(id);

  if (deleteError && !/not found|does not exist/i.test(deleteError.message)) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  // Ensure no orphaned profile remains (e.g. auth user was already gone)
  await admin.from("profiles").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
