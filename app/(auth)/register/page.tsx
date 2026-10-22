import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "حساب جديد" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">حساب جديد</h1>
      <p className="mb-6 text-muted">تحتاج كود الدعوة من صاحب الموقع.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">
        عندك حساب؟{" "}
        <Link href="/login" className="text-accent">
          سجّل الدخول
        </Link>
      </p>
    </>
  );
}
