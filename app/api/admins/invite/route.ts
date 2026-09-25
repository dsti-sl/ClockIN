// app/api/admins/invite/route.ts
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Gate: caller must be an authenticated super admin (session from cookies)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email    = typeof body?.email    === "string" ? body.email.toLowerCase().trim() : "";
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const phone    = typeof body?.phone     === "string" ? body.phone.trim() : "";

  if (!email || !fullName || !phone) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Admin client (service role) — server-side only
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  );

  // Optional MDA link — must reference an existing MDA
  const mdaIdRaw = typeof body?.mda_id === "string" ? body.mda_id.trim() : "";
  let mdaId: string | null = null;
  if (mdaIdRaw) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mdaIdRaw)) {
      return NextResponse.json({ error: "Invalid MDA selection." }, { status: 400 });
    }
    const { data: mda } = await admin.from("mdas").select("id").eq("id", mdaIdRaw).single();
    if (!mda) {
      return NextResponse.json({ error: "Selected MDA was not found." }, { status: 400 });
    }
    mdaId = mda.id;
  }

  const redirectTo = `${request.nextUrl.origin}/first-login`;

  // Sends Supabase's invite email; the link lets the invitee set their own password
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName, phone },
  });

  if (inviteError) {
    let msg = inviteError.message;
    if (/already.*(registered|exists)/i.test(msg)) {
      msg = "An account with this email already exists.";
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Create or refresh the profile row (a DB trigger may have already created a
  // bare one when the auth user was inserted, so overwrite — don't skip)
  if (invited.user) {
    await admin.from("profiles").upsert(
      {
        id:             invited.user.id,
        email,
        full_name:      fullName,
        phone,
        ...(mdaId ? { mda_id: mdaId } : {}),
        is_active:      true,
        is_first_login: true,
      },
      { onConflict: "id" }
    );
  }

  return NextResponse.json({ ok: true });
}
