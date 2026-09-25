// app/(admin)/users/[id]/page.tsx
import { createClient, getUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Mail,
  Phone,
  Building2,
  BadgeInfo,
  MapPin,
} from "lucide-react";
import UserDetailActions from "@/components/admin/UserDetailActions";
import { formatDateTime, isOnline } from "@/lib/utils";

export const revalidate = 0;

export default async function UserDetailPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const mdaName = profile.mda_id
    ? (await supabase.from("mdas").select("name").eq("id", profile.mda_id).single())
        .data?.name ?? ""
    : "";

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/users" className="btn-ghost p-2">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Admin details</h1>
      </div>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              {(profile.full_name || profile.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {profile.full_name || "—"}
              </h2>
              <p className="truncate text-sm text-gray-500 dark:text-slate-400">{profile.email}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-800">
              <span className={`h-2 w-2 rounded-full ${profile.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
              {profile.is_active ? "Active" : "Inactive"}
            </span>
            {isOnline(profile.last_seen_at) ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-300 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-800"
                title="Active in the last 5 minutes"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Online now
              </span>
            ) : profile.last_seen_at ? (
              <span className="hidden items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-400 ring-1 ring-inset ring-gray-200 sm:inline-flex dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                Seen {formatDateTime(profile.last_seen_at)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 px-5 py-4 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-400">Email</p>
              <p className="text-sm text-gray-900 dark:text-white break-all">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-400">Phone</p>
              <p className="text-sm text-gray-900 dark:text-white">{profile.phone || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-400">MDA</p>
              <p className="text-sm text-gray-900 dark:text-white">{mdaName || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BadgeInfo className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-400">Designation</p>
              <p className="text-sm text-gray-900 dark:text-white">{profile.designation || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-400">District</p>
              <p className="text-sm text-gray-900 dark:text-white">{profile.district || "—"}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Added {new Date(profile.created_at).toLocaleDateString([], {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          <div className="mt-3">
            <UserDetailActions
              adminId={profile.id}
              adminName={profile.full_name || profile.email}
              isFirstLogin={profile.is_first_login}
              canDelete={!profile.is_super_admin && profile.id !== user.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
