import type { Metadata } from "next";
import { PageTitle } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { RoleButton } from "./RoleButton";

export const metadata: Metadata = { title: "المستخدمون" };

type Row = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "member";
  created_at: string;
  last_sign_in_at: string | null;
  xp: number;
  sentences_done: number;
  sessions: number;
  current_streak: number;
  last_active_date: string | null;
};

export default async function UsersPage() {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_users");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageTitle
        title="المستخدمون"
        subtitle="تقدّم أصحابك للعرض فقط. لا يوجد زر حذف للتقدّم، ولا حتى للمدير."
      />
      {error && <p className="mb-4 text-danger">{error.message}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted">
            <tr className="border-b border-border text-start">
              <th className="p-3 text-start font-medium">الاسم</th>
              <th className="p-3 text-start font-medium">الإيميل</th>
              <th className="p-3 text-start font-medium">النقاط</th>
              <th className="p-3 text-start font-medium">الجمل</th>
              <th className="p-3 text-start font-medium">آخر نشاط</th>
              <th className="p-3 text-start font-medium">الدور</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-semibold">{r.display_name}</td>
                <td className="en p-3 text-muted">{r.email}</td>
                <td className="en p-3">{r.xp}</td>
                <td className="en p-3">{r.sentences_done}</td>
                <td className="en p-3 text-muted">{r.last_active_date ?? "—"}</td>
                <td className="p-3">
                  <RoleButton id={r.id} role={r.role} self={r.id === user.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
