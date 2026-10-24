import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import type { Report, Unit } from "@/lib/types";

export const metadata: Metadata = { title: "لوحة المدير" };

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [{ data: units }, { count: openReports }, { data: recent }, { count: people }] = await Promise.all([
    supabase.from("units").select("type, archived, published"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const list = (units ?? []) as Pick<Unit, "type" | "archived" | "published">[];
  const count = (type: string) => list.filter((u) => u.type === type && !u.archived).length;

  const tiles = [
    { label: "قصص", value: count("story"), href: "/admin/units?type=story" },
    { label: "نصوص", value: count("passage"), href: "/admin/units?type=passage" },
    { label: "قوائم كلمات", value: count("word_list"), href: "/admin/units?type=word_list" },
    { label: "بلاغات مفتوحة", value: openReports ?? 0, href: "/admin/reports" },
    { label: "مستخدمون", value: people ?? 0, href: "/admin/users" },
  ];

  return (
    <>
      <PageTitle
        title="لوحة المدير"
        subtitle="أي تعديل تحفظه هنا يظهر عند الجميع من أول تحديث للصفحة. الحذف هنا أرشفة فقط، فلا يضيع تقدّم أحد."
      />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card p-4 hover:border-accent/50">
            <div className="en text-3xl font-bold">{t.value}</div>
            <div className="mt-1 text-sm text-muted">{t.label}</div>
          </Link>
        ))}
      </div>
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">آخر البلاغات</h2>
          <Link href="/admin/reports" className="text-sm text-accent">
            كل البلاغات
          </Link>
        </div>
        {((recent ?? []) as Report[]).length === 0 ? (
          <p className="text-muted">لا توجد بلاغات مفتوحة. 👌</p>
        ) : (
          <ul className="divide-y divide-border">
            {((recent ?? []) as Report[]).map((r) => (
              <li key={r.id} className="py-3">
                <Link href={r.unit_id ? `/admin/units/${r.unit_id}?focus=${r.item_id ?? ""}` : "/admin/reports"} className="block hover:text-accent">
                  <p className="line-clamp-2 whitespace-pre-line">{r.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
