import { AppShell } from "@/components/AppShell";

// The sidebar, header and bottom bar stay mounted while moving between these
// pages: only the page itself reloads, with a skeleton from its loading.tsx.
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
