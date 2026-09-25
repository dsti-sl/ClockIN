// app/api/mdas/export/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
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

  const { data: mdas } = await supabase
    .from("mdas")
    .select("name, is_active, created_at, updated_at")
    .order("name", { ascending: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClockIN";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("MDAs");

  sheet.columns = [
    { header: "#", key: "sn", width: 6 },
    { header: "MDA Name", key: "name", width: 50 },
    { header: "Status", key: "status", width: 12 },
    { header: "Date Added", key: "created_at", width: 16 },
  ];

  mdas?.forEach((m, i) => {
    sheet.addRow({
      sn: i + 1,
      name: m.name,
      status: m.is_active ? "Active" : "Inactive",
      created_at: new Date(m.created_at).toLocaleDateString(),
    });
  });

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  headerRow.alignment = { vertical: "middle" };

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mdas_${dateStr}.xlsx"`,
    },
  });
}
