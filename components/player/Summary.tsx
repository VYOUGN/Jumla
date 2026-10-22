"use client";

import Link from "next/link";
import { Missions } from "../Missions";
import { IconReplay } from "../icons";

export type SummaryData = { items: number; accuracy: number; wpm: number; xp: number; ms: number; correct?: number; asked?: number };

export function Summary({
  data,
  backHref,
  nextHref,
  onRestart,
}: {
  data: SummaryData;
  backHref: string;
  nextHref: string | null;
  onRestart: () => void;
}) {
  const minutes = Math.max(1, Math.round(data.ms / 60_000));
  const tiles = [
    { label: "الدقة", value: `${Math.round(data.accuracy * 100)}%` },
    { label: "كلمة/دقيقة", value: String(Math.round(data.wpm)) },
    { label: "نقاط", value: `+${data.xp}` },
    { label: "دقائق", value: String(minutes) },
  ];
  return (
    <div className="mx-auto grid max-w-4xl animate-pop gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="card p-6 sm:p-8">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-4 text-2xl font-bold">أحسنت! أنهيت الدرس</h1>
        <p className="mt-2 text-muted">
          كتبت <span className="en">{data.items}</span> {data.items === 1 ? "عنصراً" : "عناصر"}
          {data.asked ? (
            <>
              {" "}
              وأجبت عن <span className="en">{data.correct}</span> من <span className="en">{data.asked}</span> أسئلة بشكل
              صحيح
            </>
          ) : null}
          . تقدّمك محفوظ.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl bg-bg p-3">
              <div className="en text-2xl font-bold">{t.value}</div>
              <div className="text-xs text-muted">{t.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {nextHref && (
            <Link href={nextHref} className="btn btn-primary">
              الدرس التالي
            </Link>
          )}
          <button className="btn btn-ghost" onClick={onRestart}>
            <IconReplay /> أعد الدرس
          </button>
          <Link href={backHref} className="btn btn-ghost">
            رجوع للقائمة
          </Link>
        </div>
      </section>
      <Missions compact />
    </div>
  );
}
