import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { AdminTabs } from "./AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <AppShell>
      <Suspense>
        <AdminTabs />
      </Suspense>
      {children}
    </AppShell>
  );
}
