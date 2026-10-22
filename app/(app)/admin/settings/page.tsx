import type { Metadata } from "next";
import { PageTitle } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { SettingForm } from "./SettingForm";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("app_settings").select("key, value");
  const settings = new Map(((data ?? []) as { key: string; value: string }[]).map((s) => [s.key, s.value]));

  return (
    <>
      <PageTitle title="الإعدادات" />
      <div className="grid gap-5 md:grid-cols-2">
        <SettingForm
          settingKey="invite_code"
          title="كود الدعوة"
          help="أعطِ هذا الكود لأصحابك ليسجّلوا. تغييره لا يؤثر على من سجّل قبل."
          value={settings.get("invite_code") ?? ""}
          generate
        />
        <SettingForm
          settingKey="admin_emails"
          title="إيميلات المدراء"
          help="أي حساب جديد بهذه الإيميلات يصبح مديراً تلقائياً. افصل بينها بفاصلة."
          value={settings.get("admin_emails") ?? ""}
        />
        <section className="card p-5 md:col-span-2">
          <h2 className="mb-2 font-bold">النسخ الاحتياطي</h2>
          <p className="leading-7 text-muted">
            نسخة كاملة من قاعدة البيانات تُحفظ تلقائياً كل يوم على GitHub (راجع README). وتقدر هنا تحمّل نسخة فورية من كل
            المحتوى والتقدّم بصيغة JSON.
          </p>
          <a href="/admin/export" className="btn btn-ghost btn-sm mt-4" download>
            تحميل نسخة JSON الآن
          </a>
        </section>
      </div>
    </>
  );
}
