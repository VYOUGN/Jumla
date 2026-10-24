import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import type { Report, Unit } from "@/lib/types";
import { ResolveButton } from "./ResolveButton";

export const metadata: Metadata = { title: "البلاغات" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const resolved = status === "resolved";
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("status", resolved ? "resolved" : "open")
    .order("created_at", { ascending: false })
    .limit(200);
  const reports = (data ?? []) as Report[];

  const unitIds = [...new Set(reports.map((r) => r.unit_id).filter(Boolean))] as string[];
  const userIds = [...new Set(reports.map((r) => r.user_id))];
  const [{ data: units }, { data: people }] = await Promise.all([
    unitIds.length ? supabase.from("units").select("id, title_en, emoji").in("id", unitIds) : Promise.resolve({ data: [] }),
    userIds.length ? supabase.from("profiles").select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const unitById = new Map(((units ?? []) as Pick<Unit, "id" | "title_en" | "emoji">[]).map((u) => [u.id, u]));
  const nameById = new Map(((people ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]));

  return (
    <>
      <PageTitle title="البلاغات" subtitle="الأخطاء التي أبلغ عنها أصحابك. اضغط «عدّل» لتفتح العنصر مباشرة.">
        <div className="flex gap-2">
          <Link href="/admin/reports" className={`chip ${!resolved ? "border-accent text-accent" : ""}`}>
            مفتوحة
          </Link>
          <Link href="/admin/reports?status=resolved" className={`chip ${resolved ? "border-accent text-accent" : ""}`}>
            محلولة
          </Link>
        </div>
      </PageTitle>
      <div className="space-y-3">
        {reports.map((r) => {
          const unit = r.unit_id ? unitById.get(r.unit_id) : undefined;
          return (
            <div key={r.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>{nameById.get(r.user_id) || "مستخدم"}</span>
                <span>·</span>
                <time className="en" dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </time>
                {unit && (
                  <>
                    <span>·</span>
                    <span className="en">
                      {unit.emoji} {unit.title_en}
                    </span>
                  </>
                )}
              </div>
              <p className="leading-7 whitespace-pre-line">{r.message}</p>
              <div className="mt-3 flex gap-2">
                {r.unit_id && (
                  <Link href={`/admin/units/${r.unit_id}?focus=${r.item_id ?? ""}`} className="btn btn-primary btn-sm">
                    عدّل
                  </Link>
                )}
                <ResolveButton id={r.id} resolved={resolved} />
              </div>
            </div>
          );
        })}
        {!reports.length && <p className="card p-6 text-muted">{resolved ? "لا توجد بلاغات محلولة بعد." : "لا توجد بلاغات مفتوحة. 👌"}</p>}
      </div>
    </>
  );
}
