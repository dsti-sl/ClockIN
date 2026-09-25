// app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile)               redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {/* top padding on mobile to clear the hamburger button */}
        <div className="pt-14 lg:pt-0 min-h-full flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-400 flex items-center justify-center gap-1">
            <img src="IMG_DSTI-removebg-preview.png" alt="DSTI" className="h-10 w-auto" /> &copy; 2026 Created By DSTI. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}