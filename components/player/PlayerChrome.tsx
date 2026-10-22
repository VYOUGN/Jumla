"use client";

import Link from "next/link";
import { useState } from "react";
import type { Prefs } from "@/lib/prefs";
import { IconSettings, IconVolume, IconVolumeOff, IconX } from "../icons";

type Props = {
  title: string;
  backHref: string;
  index: number;
  total: number;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  /** Which toggles make sense for this lesson type. */
  options?: (keyof Prefs)[];
  right?: React.ReactNode;
};

const TOGGLES: { key: keyof Prefs; label: string }[] = [
  { key: "showTranslation", label: "إظهار الترجمة العربية" },
  { key: "showHints", label: "إظهار معنى الكلمة الحالية" },
  { key: "dictation", label: "وضع الإملاء (إخفاء الحروف حتى تكتبها)" },
  { key: "ignoreCase", label: "تجاهل الحروف الكبيرة والصغيرة" },
  { key: "skipPunctuation", label: "تخطّي علامات الترقيم تلقائياً" },
];

export function PlayerChrome({ title, backHref, index, total, prefs, setPrefs, options, right }: Props) {
  const [open, setOpen] = useState(false);
  const pct = total ? Math.round((Math.min(index, total) / total) * 100) : 0;
  const toggles = TOGGLES.filter((t) => !options || options.includes(t.key));

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href={backHref} className="chip" aria-label="خروج من الدرس">
          <IconX />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="en truncate font-semibold">{title}</span>
            <span className="en shrink-0 text-muted">
              {Math.min(index + 1, total)} / {total}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {right}
        <button
          className={`chip ${prefs.autoPlay ? "text-accent" : ""}`}
          onClick={() => setPrefs({ autoPlay: !prefs.autoPlay })}
          aria-pressed={prefs.autoPlay}
          title={prefs.autoPlay ? "الصوت التلقائي يعمل" : "الصوت التلقائي متوقف"}
        >
          {prefs.autoPlay ? <IconVolume /> : <IconVolumeOff />}
        </button>
        <div className="relative">
          <button className="chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="الإعدادات">
            <IconSettings />
          </button>
          {open && (
            <div className="card absolute end-0 top-11 z-20 w-72 space-y-3 p-4 text-sm shadow-2xl">
              {toggles.map((t) => (
                <label key={t.key} className="flex cursor-pointer items-center justify-between gap-3">
                  <span>{t.label}</span>
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-accent)]"
                    checked={Boolean(prefs[t.key])}
                    onChange={(e) => setPrefs({ [t.key]: e.target.checked })}
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 flex justify-between">
                  <span>سرعة النطق</span>
                  <span className="en text-muted">{prefs.rate.toFixed(2)}×</span>
                </span>
                <input
                  type="range"
                  min={0.6}
                  max={1.3}
                  step={0.05}
                  value={prefs.rate}
                  onChange={(e) => setPrefs({ rate: Number(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                  dir="ltr"
                />
              </label>
              <button className="btn btn-ghost btn-sm w-full" onClick={() => setOpen(false)}>
                تم
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
