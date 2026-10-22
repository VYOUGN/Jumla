"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook, IconHeadphones, IconHome, IconList, IconShield, IconTrophy, IconUser } from "./icons";

const MAIN = [
  { href: "/learn", label: "الرئيسية", icon: IconHome, exact: true },
  { href: "/learn/stories", label: "القصص", icon: IconBook },
  { href: "/learn/passages", label: "النصوص", icon: IconHeadphones },
  { href: "/learn/words", label: "الكلمات", icon: IconList },
  { href: "/leaderboard", label: "الترتيب", icon: IconTrophy },
];

function useActive() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
}

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const active = useActive();
  const items = [
    ...MAIN,
    { href: "/account", label: "حسابي", icon: IconUser, tour: "account" },
    ...(isAdmin ? [{ href: "/admin", label: "لوحة المدير", icon: IconShield, tour: "admin" }] : []),
  ];
  return (
    <nav className="mt-8 flex flex-col gap-1" data-tour="nav">
      {items.map(({ href, label, icon: Icon, ...rest }) => {
        const on = active(href, "exact" in rest ? rest.exact : false);
        return (
          <Link
            key={href}
            href={href}
            data-tour={"tour" in rest ? rest.tour : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] transition-colors ${
              on ? "bg-surface-2 font-semibold text-text" : "text-muted hover:bg-surface hover:text-text"
            }`}
          >
            <Icon className={on ? "text-accent" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const active = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      data-tour="nav-mobile"
    >
      {MAIN.map(({ href, label, icon: Icon, exact }) => {
        const on = active(href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[0.7rem] ${on ? "text-accent" : "text-muted"}`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
