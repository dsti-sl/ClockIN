// app/(admin)/users/new/page.tsx
import { createClient, getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewAdminForm from "@/components/admin/NewAdminForm";

export default async function NewUserPage() {
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
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 lg:p-6">
      <NewAdminForm mdas={mdas ?? []} />
    </div>
  );
}
