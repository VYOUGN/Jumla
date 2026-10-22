"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/units?type=story", label: "القصص", type: "story" },
  { href: "/admin/units?type=passage", label: "النصوص", type: "passage" },
  { href: "/admin/units?type=word_list", label: "قوائم الكلمات", type: "word_list" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/settings", label: "الإعدادات" },
];

export function AdminTabs() {
  const path = usePathname();
  const type = useSearchParams().get("type");
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const base = t.href.split("?")[0];
        const on = t.type ? path === base && type === t.type : base === "/admin" ? path === "/admin" : path.startsWith(base);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${on ? "bg-surface-2 font-semibold text-text" : "text-muted hover:text-text"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
