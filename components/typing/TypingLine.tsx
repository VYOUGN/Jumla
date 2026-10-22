"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Prefs } from "@/lib/prefs";
import { sfx } from "@/lib/sfx";
import {
  accuracy,
  createTyping,
  currentWordIndex,
  isArabicKey,
  typeChar,
  wpm,
  type TypingOptions,
  type TypingState,
} from "@/lib/typing";
import type { WordHint } from "@/lib/words";

export type TypingResult = { accuracy: number; wpm: number; ms: number };

type Props = {
  target: string;
  hints?: WordHint[];
  prefs: Prefs;
  /** Hide letters until they are typed (listening / dictation). */
  hidden?: boolean;
  size?: "lg" | "xl";
  /** True while a dialog or tour is on top: keys are not taken as typing. */
  paused?: boolean;
  onDone: (r: TypingResult) => void;
  onReplay?: () => void;
  onEnter?: () => void;
};

/**
 * One line to type. Mount it with key={item.id}: it keeps its own progress and
 * calls onDone once when the last letter is typed.
 */
export function TypingLine({
  target,
  hints = [],
  prefs,
  hidden = false,
  size = "xl",
  paused = false,
  onDone,
  onReplay,
  onEnter,
}: Props) {
  const opts: TypingOptions = useMemo(
    () => ({ ignoreCase: prefs.ignoreCase, skipPunctuation: prefs.skipPunctuation }),
    [prefs.ignoreCase, prefs.skipPunctuation],
  );
  const [state, setState] = useState<TypingState>(() => createTyping(target, opts));
  const [lastKeyAt, setLastKeyAt] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [arabicHint, setArabicHint] = useState(false);
  // The last wrong key, shown in red at the letter where it happened.
  const [flash, setFlash] = useState<{ id: number; pos: number; char: string } | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const stateRef = useRef(state);
  const doneRef = useRef(false);
  const buffer = useRef("");
  const shiftAlone = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A settings change restarts the line with the new rules.
  useEffect(() => {
    const fresh = createTyping(target, opts);
    stateRef.current = fresh;
    doneRef.current = false;
    setState(fresh);
  }, [target, opts]);

  const focus = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) inputRef.current?.blur();
    else focus();
  }, [paused, focus]);

  useEffect(() => {
    // Typing anywhere on the page goes to the line, even after clicking a button.
    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current) return;
      const el = document.activeElement;
      const editing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (!editing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  function handle(text: string) {
    if (pausedRef.current) return;
    let s = stateRef.current;
    let wrong: { pos: number; char: string } | null = null;
    let correct = false;
    let arabic = false;
    const now = Date.now();
    for (const ch of text) {
      if (isArabicKey(ch)) {
        arabic = true;
        continue;
      }
      const pos = s.pos;
      const r = typeChar(s, ch, opts, now);
      s = r.state;
      if (r.result === "wrong") wrong = { pos, char: ch };
      if (r.result === "correct" || r.result === "done") correct = true;
      if (r.result === "done") break;
    }
    stateRef.current = s;
    setState(s);
    setLastKeyAt(now);
    setArabicHint(arabic);

    const finishing = s.finishedAt !== null && !doneRef.current;
    if (prefs.typingSounds) {
      if (finishing) sfx.done();
      else if (wrong) sfx.wrong();
      else if (correct) sfx.key();
    }
    window.clearTimeout(flashTimer.current);
    if (wrong) {
      setShakeKey((k) => k + 1);
      setFlash({ id: now, ...wrong });
      flashTimer.current = window.setTimeout(() => setFlash(null), 1200);
    } else if (correct) {
      setFlash(null);
    }

    if (finishing) {
      doneRef.current = true;
      const end = s.finishedAt ?? now;
      onDone({ accuracy: accuracy(s), wpm: wpm(s, end), ms: end - (s.startedAt ?? end) });
    }
  }

  // Diff against what the input already held, so mobile keyboards that rewrite
  // the composing word only send us the new letters.
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const prev = buffer.current;
    let i = 0;
    while (i < prev.length && i < value.length && prev[i] === value[i]) i++;
    buffer.current = value;
    const added = value.slice(i);
    if (added) handle(added);
  }

  const idx = currentWordIndex(state.target, state.pos);
  const hint = idx >= 0 ? hints[idx] : undefined;
  const done = state.finishedAt !== null;
  const missed = useMemo(() => new Set(state.missed), [state.missed]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);
  const textSize = size === "xl" ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl";

  const parts = useMemo(() => {
    const out: { text: string; start: number; space: boolean }[] = [];
    for (const m of state.target.matchAll(/\s+|\S+/g)) {
      out.push({ text: m[0], start: m.index ?? 0, space: /^\s/.test(m[0]) });
    }
    return out;
  }, [state.target]);

  return (
    <div className="relative cursor-text select-none" onClick={focus}>
      <input
        ref={inputRef}
        onChange={onChange}
        onKeyDown={(e) => {
          shiftAlone.current = e.key === "Shift";
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Shift" && shiftAlone.current) onReplay?.();
          shiftAlone.current = false;
        }}
        className="absolute top-0 left-0 size-px opacity-0"
        type="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="next"
        aria-label="اكتب الجملة الإنجليزية"
        dir="ltr"
      />

      <div className="mb-4 flex min-h-8 items-center gap-2" dir="ltr" data-tour={prefs.showHints ? "hint" : undefined}>
        {prefs.showHints && hint && !done && (
          <span className="chip animate-pop border-accent/30" key={idx}>
            <span className="en font-semibold text-text">{hint.w}</span>
            {hint.ar && (
              <span dir="rtl" className="font-sans text-accent">
                {hint.ar}
              </span>
            )}
          </span>
        )}
        {flash && flash.pos === state.pos && !done && (
          <span key={flash.id} dir="rtl" className="chip animate-pop border-danger/50 bg-danger/10 text-danger">
            ✗ كتبت <span className="en font-semibold">«{flash.char === " " ? "مسافة" : flash.char}»</span>
          </span>
        )}
        {arabicHint && (
          <span dir="rtl" className="chip border-flame/40 text-flame">
            حوّل لوحة المفاتيح إلى الإنجليزية
          </span>
        )}
      </div>

      <p className={`en ${textSize} leading-[1.35] font-semibold tracking-tight`} aria-live="polite" data-tour="sentence">
        <span key={shakeKey} className={shakeKey ? "inline animate-shake" : "inline"}>
          {parts.map((p) =>
            p.space ? (
              <span key={p.start}> </span>
            ) : (
              <span key={p.start} className="inline-block whitespace-nowrap">
                {[...p.text].map((ch, j) => {
                  const i = p.start + j;
                  const typed = i < state.pos;
                  const current = i === state.pos && !done;
                  const wrongHere = current && flash?.pos === i;
                  // Letters that needed more than one try stay red, so mistakes are easy to spot.
                  const color = typed
                    ? missed.has(i)
                      ? "text-danger"
                      : done
                        ? "text-accent"
                        : "text-text"
                    : hidden
                      ? "text-transparent"
                      : wrongHere
                        ? "text-danger"
                        : "text-faint";
                  const mark = current
                    ? wrongHere
                      ? "rounded-sm border-b-[3px] border-danger bg-danger/25"
                      : "border-b-[3px] border-accent"
                    : !typed && hidden
                      ? "border-b-2 border-faint"
                      : "";
                  return (
                    <span key={i} className={`${color} ${mark}`}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            ),
          )}
        </span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm" dir="rtl" data-tour="live-stats">
        <span className="chip">
          الدقة{" "}
          <span
            className={`en ${accuracy(state) >= 0.95 ? "text-ok" : accuracy(state) >= 0.8 ? "text-text" : "text-danger"}`}
          >
            {Math.round(accuracy(state) * 100)}%
          </span>
        </span>
        <span className="chip">
          <span className="en text-text">{wpm(state, state.finishedAt ?? lastKeyAt)}</span> كلمة/دقيقة
        </span>
      </div>
    </div>
  );
}
