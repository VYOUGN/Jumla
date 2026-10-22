import type { Metadata } from "next";
import { AppShell, PageTitle } from "@/components/AppShell";
import { getStats, requireViewer } from "@/lib/auth";
import { updateDisplayName } from "./actions";
import { PasswordForm, SignOutButton, SyncPanel } from "./AccountClient";

export const metadata: Metadata = { title: "حسابي" };

export default async function AccountPage() {
  const { profile, user } = await requireViewer();
  const stats = await getStats();
  return (
    <AppShell>
      <PageTitle title="حسابي" subtitle={user.email ?? undefined} />
      <div className="grid gap-5 md:grid-cols-2">
        <form action={updateDisplayName} className="card space-y-3 p-5">
          <h2 className="font-bold">اسمك الظاهر لأصحابك</h2>
          <input name="name" defaultValue={profile.display_name} maxLength={40} required className="input" />
          <button className="btn btn-ghost btn-sm">حفظ</button>
        </form>
        <SyncPanel />
        <section className="card p-5">
          <h2 className="mb-3 font-bold">إحصائياتك</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted">النقاط</dt>
            <dd className="en">{stats?.xp ?? 0}</dd>
            <dt className="text-muted">الجمل</dt>
            <dd className="en">{stats?.sentences_done ?? 0}</dd>
            <dt className="text-muted">الكلمات المكتوبة</dt>
            <dd className="en">{stats?.words_typed ?? 0}</dd>
            <dt className="text-muted">أطول ستريك</dt>
            <dd className="en">{stats?.longest_streak ?? 0}</dd>
          </dl>
        </section>
        <PasswordForm />
      </div>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </AppShell>
  );
}
