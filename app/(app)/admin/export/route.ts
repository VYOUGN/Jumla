import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TABLES = [
  "units",
  "sentences",
  "questions",
  "words",
  "profiles",
  "user_stats",
  "unit_progress",
  "item_progress",
  "progress_events",
  "reports",
  "app_settings",
] as const;

// A point-in-time JSON copy of everything an admin can read.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const out: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await viewer.supabase.from(table).select("*").range(from, from + 999);
      if (error) return NextResponse.json({ error: `${table}: ${error.message}` }, { status: 500 });
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    out[table] = rows;
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), tables: out }, null, 1), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="jumla-backup-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
