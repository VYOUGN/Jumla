"use client";

import { useEffect, useRef } from "react";
import type { Prefs } from "@/lib/prefs";
import { speak } from "@/lib/speech";
import { IconVolume, IconX } from "../icons";

type ToggleKey = Exclude<keyof Prefs, "rate">;

const GROUPS: { title: string; items: { key: ToggleKey; label: string; help: string }[] }[] = [
  {
    title: "مساعدة أثناء الكتابة",
    items: [
      { key: "showTranslation", label: "إظهار الترجمة العربية", help: "تظهر الترجمة العربية تحت الجملة أو المثال." },
      { key: "showHints", label: "إظهار معنى الكلمة الحالية", help: "يظهر معنى الكلمة اللي تكتبها الحين فوق الجملة." },
      {
        key: "dictation",
        label: "وضع الإملاء 🎧",
        help: "تختفي حروف الجملة وتكتب اللي تسمعه. أصعب، لكنه يدرّب أذنك ويعطيك نقاط مكافأة مع كل جملة.",
      },
    ],
  },
  {
    title: "قواعد الكتابة",
    items: [
      { key: "ignoreCase", label: "تجاهل الحروف الكبيرة والصغيرة", help: "تكتب i بدل I بدون ما تنحسب غلطة." },
      { key: "skipPunctuation", label: "تخطّي علامات الترقيم", help: "الفواصل والنقاط وعلامات الاقتباس تنكتب عنك تلقائياً." },
    ],
  },
  {
    title: "الصوت",
    items: [
      { key: "autoPlay", label: "تشغيل الصوت تلقائياً", help: "تسمع كل جملة أول ما تظهر." },
      {
        key: "typingSounds",
        label: "مؤثرات صوتية للكتابة",
        help: "صوت خفيف مع كل حرف صحيح، وصوت مختلف للحرف الغلط، ونغمة عند إكمال الجملة.",
      },
    ],
  },
];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? "border-accent bg-accent" : "border-border bg-surface-2"
      }`}
    >
      <span
        className={`absolute top-0.5 size-[1.125rem] rounded-full transition-all ${
          checked ? "left-0.5 bg-accent-ink" : "left-[1.3rem] bg-muted"
        }`}
      />
    </button>
  );
}

type Props = {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  /** Settings that apply to this lesson type; all when omitted. */
  options?: (keyof Prefs)[];
  onClose: () => void;
};

export function SettingsDialog({ prefs, setPrefs, options, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const shows = (key: keyof Prefs) => !options || options.includes(key);

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-settings-title"
    >
      <div
        className="card max-h-[88dvh] w-full animate-pop overflow-y-auto rounded-b-none p-5 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="lesson-settings-title" className="text-lg font-bold">
            إعدادات الدرس
          </h2>
          <button ref={closeButton} className="chip" onClick={onClose} aria-label="إغلاق">
            <IconX />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">تُحفظ على هذا الجهاز، وتنطبق على كل الدروس.</p>

        {GROUPS.map((group) => {
          const items = group.items.filter((i) => shows(i.key));
          const withRate = group.title === "الصوت" && shows("rate");
          if (!items.length && !withRate) return null;
          return (
            <section key={group.title} className="border-t border-border py-4">
              <h3 className="mb-3 text-sm font-semibold text-accent">{group.title}</h3>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-0.5 text-sm leading-6 text-muted">{item.help}</p>
                    </div>
                    <Switch
                      checked={Boolean(prefs[item.key])}
                      onChange={(v) => setPrefs({ [item.key]: v })}
                      label={item.label}
                    />
                  </div>
                ))}
                {withRate && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">سرعة النطق</p>
                      <span className="en text-sm text-muted">{prefs.rate.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.3}
                      step={0.05}
                      value={prefs.rate}
                      onChange={(e) => setPrefs({ rate: Number(e.target.value) })}
                      className="mt-2 w-full accent-[var(--color-accent)]"
                      dir="ltr"
                      aria-label="سرعة النطق"
                    />
                    <div className="flex justify-between text-xs text-muted" dir="ltr">
                      <span>أبطأ</span>
                      <span>أسرع</span>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm mt-3"
                      onClick={() => void speak("This is how fast I will read each sentence.", prefs.rate)}
                    >
                      <IconVolume /> جرّب الصوت
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}

        <button className="btn btn-primary mt-2 w-full" onClick={onClose}>
          تم
        </button>
      </div>
    </div>
  );
}
