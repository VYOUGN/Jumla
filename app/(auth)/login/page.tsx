import type { Metadata } from "next";
import Link from "next/link";
import { HashNotice } from "@/components/HashNotice";
import { safeNext } from "@/lib/auth-errors";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">أهلاً بعودتك</h1>
      <p className="mb-6 text-muted">سجّل الدخول لتكمل من حيث توقفت.</p>
      <HashNotice />
      {error === "link" && (
        <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm leading-7 text-danger">
          ما قدرنا نكمل الرابط، ربما انتهت صلاحيته أو فتحته في متصفح ثاني. إذا كان رابط تأكيد الإيميل، جرّب تسجّل الدخول
          الآن، فغالباً تم التأكيد. وإذا ما زبط، اطلب رابطاً جديداً.
        </p>
      )}
      <LoginForm next={safeNext(next)} />
      <div className="mt-6 flex justify-between text-sm text-muted">
        <Link href="/forgot" className="hover:text-text">
          نسيت كلمة المرور؟
        </Link>
        <Link href="/register" className="hover:text-text">
          حساب جديد
        </Link>
      </div>
    </>
  );
}
