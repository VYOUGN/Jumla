import Link from "next/link";
import { getStats, requireViewer } from "@/lib/auth";
import { IconShield, IconUser } from "./icons";
import { Logo } from "./Logo";
import { BottomNav, SideNav } from "./NavLinks";
import { StatBadges } from "./StatBadges";
import { SyncIndicator } from "./SyncIndicator";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = await requireViewer();
  const stats = await getStats();
  const isAdmin = profile.role === "admin";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-border p-5 lg:flex">
        <Logo />
        <SideNav isAdmin={isAdmin} />
        <div className="mt-auto truncate text-sm text-muted">{profile.display_name}</div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex" data-tour="sync">
              <SyncIndicator />
            </span>
            <span className="flex items-center gap-2" data-tour="badges">
              <StatBadges stats={stats} />
            </span>
            {isAdmin && (
              <Link href="/admin" className="chip border-accent/40 text-accent lg:hidden" data-tour="admin-mobile">
                <IconShield /> المدير
              </Link>
            )}
            <Link href="/account" className="chip lg:hidden" aria-label="حسابي" data-tour="account-mobile">
              <IconUser />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl leading-7 text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
