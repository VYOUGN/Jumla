"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { xpFor } from "@/lib/gamification";
import { usePrefs } from "@/lib/prefs";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import type { Unit, Word } from "@/lib/types";
import { IconVolume } from "../icons";
import { useProgress } from "../ProgressProvider";
import { TypingLine, type TypingResult } from "../typing/TypingLine";
import { PlayerChrome } from "./PlayerChrome";
import { ReportButton } from "./ReportButton";
import { Summary, type SummaryData } from "./Summary";
import { UnitIntro } from "./UnitIntro";

type Props = {
  unit: Unit;
  words: Word[];
  doneCount: number;
  startAt: number;
  backHref: string;
  nextHref: string | null;
};

type Phase = "ready" | "study" | "type" | "summary";

/** See the word, hear it, then type it from memory with its letters hidden. */
export function WordsPlayer({ unit, words, doneCount, startAt, backHref, nextHref }: Props) {
  const router = useRouter();
  const { record, flush } = useProgress();
  const [prefs, setPrefs] = usePrefs();
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(startAt);
  const [reveal, setReveal] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const results = useRef<TypingResult[]>([]);
  const startedAt = useRef(0);
  const advance = useRef<number | undefined>(undefined);
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const word = words[index];
  const say = useCallback((text: string) => void speak(text, prefsRef.current.rate), []);

  useEffect(() => {
    if ((phase === "study" || phase === "type") && word && prefsRef.current.autoPlay) say(word.word);
  }, [phase, word, say]);

  useEffect(() => () => {
    window.clearTimeout(advance.current);
    stopSpeaking();
  }, []);

  // Enter moves from studying a word to typing it.
  useEffect(() => {
    if (phase !== "study") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") setPhase("type");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  function begin(from: number) {
    results.current = [];
    startedAt.current = Date.now();
    setIndex(from);
    setSummary(null);
    setJustDone(false);
    setReveal(false);
    setPhase("study");
  }

  async function finish() {
    const r = results.current;
    const n = r.length || 1;
    setSummary({
      items: r.length,
      accuracy: r.reduce((a, x) => a + x.accuracy, 0) / n,
      wpm: r.reduce((a, x) => a + x.wpm, 0) / n,
      xp: r.reduce((a, x) => a + xpFor("word", x.accuracy, null, null), 0) + xpFor("unit_complete", null, null, null),
      ms: Date.now() - startedAt.current,
    });
    setPhase("summary");
    await record({ kind: "unit_complete", unit_id: unit.id });
    await flush();
    router.refresh();
  }

  function next() {
    window.clearTimeout(advance.current);
    setJustDone(false);
    setReveal(false);
    if (index + 1 < words.length) {
      setIndex(index + 1);
      setPhase("study");
    } else void finish();
  }

  function onDone(r: TypingResult) {
    results.current.push(r);
    setJustDone(true);
    void record({
      kind: "word",
      item_id: word.id,
      unit_id: unit.id,
      position: index,
      accuracy: r.accuracy,
      wpm: r.wpm,
      word_count: 1,
    });
    advance.current = window.setTimeout(next, 900);
  }

  if (phase === "summary" && summary) {
    return <Summary data={summary} backHref={backHref} nextHref={nextHref} onRestart={() => begin(0)} />;
  }

  if (phase === "ready") {
    return (
      <UnitIntro
        unit={unit}
        backHref={backHref}
        counts={[`${words.length} كلمة`, `أنجزت ${doneCount} من ${words.length}`]}
        startAt={startAt}
        total={words.length}
        onStart={begin}
        speechMissing={!speechSupported()}
      />
    );
  }

  return (
    <>
      <PlayerChrome
        title={unit.title_en}
        backHref={backHref}
        index={index}
        total={words.length}
        prefs={prefs}
        setPrefs={setPrefs}
        options={["showTranslation", "ignoreCase"]}
      />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        {phase === "study" ? (
          <div className="card animate-pop p-6 text-center sm:p-10" key={word.id}>
            <p className="text-sm text-muted">تعرّف على الكلمة</p>
            <h1 className="en mt-4 text-5xl font-bold sm:text-6xl">{word.word}</h1>
            <p className="mt-3 text-2xl text-accent">{word.translation_ar}</p>
            {word.example_en && (
              <div className="mt-8 rounded-xl bg-bg p-4">
                <p className="en text-lg">{word.example_en}</p>
                {prefs.showTranslation && word.example_ar && <p className="mt-2 text-muted">{word.example_ar}</p>}
              </div>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className="btn btn-ghost" onClick={() => say(word.word)}>
                <IconVolume /> استمع
              </button>
              <button className="btn btn-primary" onClick={() => setPhase("type")} autoFocus>
                اكتبها من ذاكرتك <kbd className="en text-xs">Enter</kbd>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-muted">اكتب الكلمة التي معناها:</p>
            <p className="mb-8 text-3xl font-semibold text-accent">{word.translation_ar}</p>
            <TypingLine
              key={`${word.id}:${reveal}`}
              target={word.word}
              prefs={{ ...prefs, showHints: false, skipPunctuation: true }}
              hidden={!reveal}
              onDone={onDone}
              onReplay={() => say(word.word)}
              onEnter={() => justDone && next()}
            />
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => say(word.word)}>
                <IconVolume /> استمع <kbd className="en hidden text-xs text-muted sm:inline">Shift</kbd>
              </button>
              {!reveal && !justDone && (
                <button className="btn btn-ghost btn-sm" onClick={() => setReveal(true)}>
                  أظهر الحروف
                </button>
              )}
              <ReportButton unitId={unit.id} itemId={word.id} itemType="word" context={`${word.word} — ${word.translation_ar}`} />
              {justDone && (
                <button className="btn btn-primary btn-sm ms-auto animate-pop" onClick={next}>
                  التالي <kbd className="en text-xs">Enter</kbd>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
