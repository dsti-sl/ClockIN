// app/(admin)/users/page.tsx
import { createClient, getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Profile } from "@/lib/types";
import UsersTable from "@/components/admin/UsersTable";
import ThemeToggle from "@/components/ui/ThemeToggle";

export const revalidate = 0;

export default async function UsersPage() {
  const user = await getUser();
  if (!user) return

  const supabase = await createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_super_admin) redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: mdas } = await supabase
    .from("mdas")
    .select("id, name");

  const mdaNameById = (mdas ?? []).reduce<Record<string, string>>(
    (acc, m) => { acc[m.id] = m.name; return acc; },
    {}
  );

  const rows = (profiles ?? []).map((p) => ({
    ...p,
    mda: p.mda_id && mdaNameById[p.mda_id] ? { name: mdaNameById[p.mda_id] } : null,
  }));

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Admin accounts</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/users/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add admin
          </Link>
        </div>
      </div>

      <UsersTable users={rows as Profile[]} />
    </div>
  );
}
