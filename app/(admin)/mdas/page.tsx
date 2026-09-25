// app/(admin)/mdas/page.tsx
import { createClient, getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import type { Mda } from "@/lib/types";
import MdasList from "@/components/admin/MdasList";
import ThemeToggle from "@/components/ui/ThemeToggle";

export const revalidate = 0;

export default async function MdasPage() {
  const user = await getUser();
  if (!user) return

  const supabase = await createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_super_admin) redirect("/dashboard");

  const { data: mdas } = await supabase
    .from("mdas")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">MDAs</h1>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Ministries, departments & agencies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/mdas/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add MDA
          </Link>
        </div>
      </div>

      <MdasList mdas={(mdas as Mda[]) ?? []} />
    </div>
  );
}
