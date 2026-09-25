// app/(admin)/mdas/[id]/page.tsx
import { createClient, getUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Building2,
  Users,
  UserPlus,
} from "lucide-react";
import type { Profile } from "@/lib/types";

export const revalidate = 0;

export default async function MdaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return

  const supabase = await createClient();

  // Only super admins can view
  const { data: me } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_super_admin) redirect("/dashboard");

  const { data: mda } = await supabase
    .from("mdas")
    .select("*")
    .eq("id", id)
    .single();

  if (!mda) notFound();

  // Admins linked to this MDA
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_active")
    .eq("mda_id", id)
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/mdas" className="btn-ghost p-2">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">MDA details</h1>
      </div>

      <div className="card overflow-hidden">
        {/* Hero */}
        <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-6 dark:border-slate-700">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white">{mda.name}</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400">Ministry, Department & Agency</p>
          </div>
          {admins && admins.length > 0 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-gray-200 dark:bg-slate-800 dark:ring-slate-700">
              <span className={`h-2 w-2 rounded-full ${mda.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
              <span className={mda.is_active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-slate-500"}>
                {mda.is_active ? "Active" : "Inactive"}
              </span>
            </span>
          )}
        </div>

        {/* Linked admins */}
        <div className="space-y-3 px-6 py-5 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400 dark:text-slate-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Linked admins</span>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              {admins?.length ?? 0}
            </span>
          </div>

          {!admins?.length ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-slate-700 dark:text-slate-500">
              No admins linked to this MDA yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-slate-800 dark:border-slate-700">
              {admins.map((a: Pick<Profile, "id" | "email" | "full_name" | "is_active">) => (
                <Link
                  key={a.id}
                  href={`/users/${a.id}`}
                  className="group flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white">
                    {(a.full_name || a.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{a.full_name || "—"}</p>
                    <p className="truncate text-xs text-gray-400 dark:text-slate-400">{a.email}</p>
                  </div>
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${a.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/users/new"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite a new admin
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Created{" "}
            {new Date(mda.created_at).toLocaleDateString([], {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}{" "}
            · Updated{" "}
            {new Date(mda.updated_at).toLocaleDateString([], {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Link href="/mdas" className="btn-secondary">
              Back to list
            </Link>
            <Link href={`/mdas/${mda.id}/edit`} className="btn-primary">
              Edit MDA
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
