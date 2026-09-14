// components/layout/Sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  User,
  X,
  Menu,
  BarChart3,
  LogOut,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { Spinner } from "../ui/Spinner";

function buildNav(isSuperAdmin: boolean) {
  return [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: Calendar },
    ...(isSuperAdmin
      ? [
          { label: "MDAs", href: "/mdas", icon: Building2 },
          { label: "Users", href: "/users", icon: Users },
        ]
      : [{ label: "Profile", href: "/profile", icon: User }]),
  ];
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  const nav = buildNav(profile.is_super_admin ?? false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight dark:text-white">
            Smart Attendance
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-400">
            {profile.is_super_admin ? "Super Admin" : "Admin"}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700 lg:hidden"
        >
          <X className="h-4 w-4 text-gray-400 dark:text-slate-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <button
              key={href}
              type="button"
              onClick={() => {
                if (pathname === href) return;

                setLoadingHref(href);
                setOpen(false);

                startTransition(() => {
                  router.push(href);
                });
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                active
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />

              <span className="flex-1">{label}</span>

              {loadingHref === href && isPending && (
                <Spinner
                  size="sm"
                  className={active ? "text-white" : "text-indigo-600"}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-100 p-3 dark:border-slate-800">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 flex-shrink-0 dark:bg-indigo-950/40 dark:text-indigo-300">
            {(profile.full_name || profile.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
              {profile.full_name || "Admin"}
            </p>
            <p className="truncate text-[10px] text-gray-400 dark:text-slate-400">
              {profile.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:hidden"
      >
        <Menu className="h-4 w-4 text-gray-600 dark:text-slate-300" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r border-gray-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {renderSidebarContent()}
      </aside>

      <aside className="hidden w-60 flex-shrink-0 border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        {renderSidebarContent()}
      </aside>
    </>
  );
}
