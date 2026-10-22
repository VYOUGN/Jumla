import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <Logo href="/" />
      <div className="flex flex-1 items-center py-10">
        <div className="card w-full p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
