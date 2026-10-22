import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getViewer } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!hasSupabaseEnv()) return <SetupNeeded />;
  if (await getViewer()) redirect("/learn");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href="/" />
        <Link href="/login" className="btn btn-ghost btn-sm">
          تسجيل الدخول
        </Link>
      </header>

      <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-2">
        <div>
          <p className="chip mb-5">لك ولأصحابك</p>
          <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
            اسمع الجملة،
            <br />
            <span className="text-accent">اكتبها بيدك.</span>
          </h1>
          <p className="mt-5 max-w-md leading-8 text-muted">
            كل جملة تكتبها حرفاً بحرف تثبت في ذاكرتك: نطقها، وإملاءها، ومعنى كل كلمة فيها. قصص قصيرة، ونصوص
            للاستماع، وقوائم كلمات، وستريك يومي تتنافس فيه مع أصحابك.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary">
              عندي كود دعوة
            </Link>
            <Link href="/login" className="btn btn-ghost">
              عندي حساب
            </Link>
          </div>
        </div>

        <div className="card p-6 sm:p-8" aria-hidden>
          <div className="mb-6 flex items-center justify-between text-sm text-muted">
            <span>قصة: أول يوم في العمل</span>
            <span className="en">3 / 9</span>
          </div>
          <p className="en text-3xl leading-snug font-semibold sm:text-4xl">
            <span>She found a seat </span>
            <span className="text-faint">by the window.</span>
          </p>
          <div className="mt-4 h-0.5 w-16 rounded bg-accent" />
          <p className="mt-6 text-muted">وجدت مقعداً بجانب النافذة.</p>
          <div className="mt-6 flex gap-2 text-sm">
            <span className="chip">الدقة 98%</span>
            <span className="chip">
              <span className="en">34</span> كلمة/دقيقة
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function SetupNeeded() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Logo href="/" />
      <div className="card mt-8 p-6 leading-8">
        <h1 className="mb-3 text-xl font-bold">الموقع يحتاج إعداد Supabase</h1>
        <p className="text-muted">
          انسخ الملف <code className="en">.env.example</code> إلى <code className="en">.env.local</code> واملأ قيم
          Supabase، ثم أعد تشغيل الموقع. الخطوات كاملة في ملف <code className="en">README.md</code>.
        </p>
      </div>
    </main>
  );
}
