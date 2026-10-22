"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LEVEL_LABELS } from "@/lib/gamification";
import type { Unit } from "@/lib/types";
import { Cover } from "../Cover";
import { IconX } from "../icons";

type Props = {
  unit: Unit;
  backHref: string;
  counts: string[];
  startAt: number;
  total: number;
  onStart: (from: number) => void;
  speechMissing?: boolean;
  extra?: React.ReactNode;
};

/** The screen before a lesson starts. The click also unlocks audio, which browsers require. */
export function UnitIntro({ unit, backHref, counts, startAt, total, onStart, speechMissing, extra }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && total > 0) onStart(startAt);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart, startAt, total]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      <Link href={backHref} className="chip mb-6" aria-label="رجوع">
        <IconX /> رجوع
      </Link>
      <div className="card overflow-hidden">
        <Cover theme={unit.theme} emoji={unit.emoji} url={unit.cover_url} size="lg" className="h-48 sm:h-60" />
        <div className="p-6 sm:p-8">
          <span className="chip">
            <span className="en">{unit.level}</span> · {LEVEL_LABELS[unit.level]}
          </span>
          <h1 className="en mt-4 text-3xl font-bold">{unit.title_en}</h1>
          <p className="mt-1 text-lg text-muted">{unit.title_ar}</p>
          {unit.description_ar && <p className="mt-4 leading-8 text-muted">{unit.description_ar}</p>}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {counts.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
          {speechMissing && (
            <p className="mt-4 rounded-lg bg-flame/10 p-3 text-sm text-flame">
              متصفحك لا يدعم النطق الصوتي. تقدر تكتب وتتعلّم، لكن بدون صوت. جرّب Chrome أو Safari أو Edge.
            </p>
          )}
          {total === 0 ? (
            <p className="mt-6 text-muted">لا يوجد محتوى في هذا الدرس بعد.</p>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              {startAt > 0 ? (
                <>
                  <button className="btn btn-primary" onClick={() => onStart(startAt)} autoFocus>
                    أكمل من رقم <span className="en">{startAt + 1}</span>
                  </button>
                  <button className="btn btn-ghost" onClick={() => onStart(0)}>
                    من البداية
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => onStart(0)} autoFocus>
                  ابدأ
                </button>
              )}
              {extra}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
