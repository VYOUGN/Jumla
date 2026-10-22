"use client";

import Link from "next/link";
import type { Prefs } from "@/lib/prefs";
import { IconSettings, IconVolume, IconVolumeOff, IconX } from "../icons";
import { SettingsDialog } from "./SettingsDialog";

type Props = {
  title: string;
  backHref: string;
  index: number;
  total: number;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  /** Settings that apply to this lesson type; all when omitted. */
  options?: (keyof Prefs)[];
  settingsOpen: boolean;
  onSettingsChange: (open: boolean) => void;
  /** Replays the lesson tour; the help button is hidden without it. */
  onHelp?: () => void;
  right?: React.ReactNode;
};

export function PlayerChrome({
  title,
  backHref,
  index,
  total,
  prefs,
  setPrefs,
  options,
  settingsOpen,
  onSettingsChange,
  onHelp,
  right,
}: Props) {
  const pct = total ? Math.round((Math.min(index, total) / total) * 100) : 0;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-3">
          <Link href={backHref} className="chip" aria-label="خروج من الدرس" title="خروج (تقدّمك محفوظ)" data-tour="exit">
            <IconX />
          </Link>
          <div className="min-w-0 flex-1" data-tour="progress">
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
            className={`chip ${prefs.autoPlay ? "border-accent/40 text-accent" : ""}`}
            onClick={() => setPrefs({ autoPlay: !prefs.autoPlay })}
            aria-pressed={prefs.autoPlay}
            title={prefs.autoPlay ? "الصوت التلقائي يعمل: اضغط لإيقافه" : "الصوت التلقائي متوقف: اضغط لتشغيله"}
            data-tour="autoplay"
          >
            {prefs.autoPlay ? <IconVolume /> : <IconVolumeOff />}
            <span className="hidden md:inline">{prefs.autoPlay ? "الصوت: يعمل" : "الصوت: متوقف"}</span>
          </button>
          <button className="chip hover:text-text" onClick={() => onSettingsChange(true)} data-tour="settings">
            <IconSettings />
            <span className="hidden sm:inline">الإعدادات</span>
          </button>
          {onHelp && (
            <button className="chip hover:text-text" onClick={onHelp} title="اشرح لي هذي الشاشة" data-tour="help">
              <span className="font-bold" aria-hidden>
                ؟
              </span>
              <span className="hidden sm:inline">مساعدة</span>
            </button>
          )}
        </div>
      </header>
      {settingsOpen && (
        <SettingsDialog prefs={prefs} setPrefs={setPrefs} options={options} onClose={() => onSettingsChange(false)} />
      )}
    </>
  );
}
