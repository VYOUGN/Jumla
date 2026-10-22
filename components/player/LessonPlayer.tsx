"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { xpFor } from "@/lib/gamification";
import { usePrefs } from "@/lib/prefs";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import type { Question, Sentence, Unit } from "@/lib/types";
import { countWords } from "@/lib/words";
import { Cover } from "../Cover";
import { IconEye, IconEyeOff, IconPlay, IconVolume } from "../icons";
import { useProgress } from "../ProgressProvider";
import { lessonTourSteps } from "../tour/lessonSteps";
import { Tour, useTour } from "../tour/Tour";
import { TypingLine, type TypingResult } from "../typing/TypingLine";
import { PlayerChrome } from "./PlayerChrome";
import { ReportButton } from "./ReportButton";
import { Summary, type SummaryData } from "./Summary";
import { UnitIntro } from "./UnitIntro";

type Props = {
  mode: "story" | "passage";
  unit: Unit;
  sentences: Sentence[];
  questions: Question[];
  doneCount: number;
  startAt: number;
  backHref: string;
  nextHref: string | null;
  /** Guided tours this person has already finished. */
  toursSeen: string[];
};

type Phase = "ready" | "typing" | "questions" | "summary";

export function LessonPlayer({ mode, unit, sentences, questions, doneCount, startAt, backHref, nextHref, toursSeen }: Props) {
  const router = useRouter();
  const { record, flush } = useProgress();
  const [prefs, setPrefs] = usePrefs();
  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(startAt);
  const [justDone, setJustDone] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [listenOnly, setListenOnly] = useState(mode === "passage");
  const [playingAll, setPlayingAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tour = useTour("lesson", toursSeen.includes("lesson"), phase === "typing");
  const tourSteps = useMemo(() => lessonTourSteps(mode), [mode]);

  const results = useRef<TypingResult[]>([]);
  const answers = useRef<boolean[]>([]);
  const startedAt = useRef(0);
  const advance = useRef<number | undefined>(undefined);
  const playToken = useRef(0);
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const sentence = sentences[index];
  const hidden = mode === "passage" ? listenOnly : prefs.dictation;

  const say = useCallback((text: string) => void speak(text, prefsRef.current.rate), []);

  useEffect(() => {
    if (phase === "typing" && sentence && prefsRef.current.autoPlay) say(sentence.text_en);
  }, [phase, sentence, say]);

  useEffect(() => () => {
    window.clearTimeout(advance.current);
    stopSpeaking();
  }, []);

  function begin(from: number) {
    playToken.current++;
    stopSpeaking();
    setPlayingAll(false);
    results.current = [];
    answers.current = [];
    startedAt.current = Date.now();
    setIndex(from);
    setQIndex(0);
    setChosen(null);
    setJustDone(false);
    setSummary(null);
    setPhase(sentences.length ? "typing" : questions.length ? "questions" : "ready");
  }

  async function finish() {
    const r = results.current;
    const n = r.length || 1;
    const correct = answers.current.filter(Boolean).length;
    setSummary({
      items: r.length,
      accuracy: r.reduce((a, x) => a + x.accuracy, 0) / n,
      wpm: r.reduce((a, x) => a + x.wpm, 0) / n,
      xp:
        r.reduce((a, x) => a + xpFor("sentence", x.accuracy, null, null), 0) +
        answers.current.reduce((a, ok) => a + xpFor("question", null, ok, null), 0) +
        xpFor("unit_complete", null, null, null),
      ms: Date.now() - startedAt.current,
      correct,
      asked: answers.current.length,
    });
    setPhase("summary");
    await record({ kind: "unit_complete", unit_id: unit.id });
    await flush();
    router.refresh();
  }

  function next() {
    window.clearTimeout(advance.current);
    setJustDone(false);
    if (index + 1 < sentences.length) setIndex(index + 1);
    else if (mode === "passage" && questions.length) setPhase("questions");
    else void finish();
  }

  function onSentenceDone(r: TypingResult) {
    results.current.push(r);
    setJustDone(true);
    void record({
      kind: "sentence",
      item_id: sentence.id,
      unit_id: unit.id,
      position: index,
      accuracy: r.accuracy,
      wpm: r.wpm,
      word_count: countWords(sentence.text_en),
    });
    advance.current = window.setTimeout(next, 900);
  }

  async function playAll() {
    const token = ++playToken.current;
    if (playingAll) {
      stopSpeaking();
      setPlayingAll(false);
      return;
    }
    setPlayingAll(true);
    for (const s of sentences) {
      if (playToken.current !== token) return;
      await speak(s.text_en, prefsRef.current.rate);
    }
    if (playToken.current === token) setPlayingAll(false);
  }

  function answer(i: number) {
    if (chosen !== null) return;
    const q = questions[qIndex];
    const ok = i === q.correct_index;
    setChosen(i);
    answers.current.push(ok);
    void record({ kind: "question", item_id: q.id, unit_id: unit.id, position: qIndex, correct: ok });
  }

  function nextQuestion() {
    setChosen(null);
    if (qIndex + 1 < questions.length) setQIndex(qIndex + 1);
    else void finish();
  }

  if (phase === "summary" && summary) {
    return <Summary data={summary} backHref={backHref} nextHref={nextHref} onRestart={() => begin(0)} />;
  }

  if (phase === "ready") {
    return (
      <UnitIntro
        unit={unit}
        backHref={backHref}
        counts={[
          `${sentences.length} جملة`,
          ...(questions.length ? [`${questions.length} أسئلة`] : []),
          `أنجزت ${doneCount} من ${sentences.length}`,
        ]}
        startAt={startAt}
        total={sentences.length}
        onStart={begin}
        speechMissing={!speechSupported()}
        extra={
          mode === "passage" && sentences.length > 0 ? (
            <button className="btn btn-ghost" onClick={() => void playAll()}>
              <IconPlay /> {playingAll ? "إيقاف" : "استمع للنص كاملاً"}
            </button>
          ) : null
        }
      />
    );
  }

  const title = unit.title_en;

  if (phase === "questions") {
    const q = questions[qIndex];
    return (
      <>
        <PlayerChrome
          title={title}
          backHref={backHref}
          index={qIndex}
          total={questions.length}
          prefs={prefs}
          setPrefs={setPrefs}
          options={["autoPlay", "rate"]}
          settingsOpen={settingsOpen}
          onSettingsChange={setSettingsOpen}
        />
        <main className="mx-auto max-w-2xl px-4 py-10">
          <p className="mb-2 text-sm text-muted">سؤال فهم</p>
          <h2 className="en text-2xl leading-snug font-semibold">{q.prompt_en}</h2>
          {q.prompt_ar && <p className="mt-2 text-muted">{q.prompt_ar}</p>}
          <div className="mt-6 grid gap-3">
            {q.options.map((opt, i) => {
              const state =
                chosen === null ? "" : i === q.correct_index ? "border-ok bg-ok/10" : i === chosen ? "border-danger bg-danger/10" : "opacity-60";
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  className={`card en px-4 py-3 text-start text-lg transition-colors hover:border-accent/60 ${state}`}
                  dir="ltr"
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center gap-3">
            {chosen !== null && (
              <>
                <span className={chosen === q.correct_index ? "text-ok" : "text-danger"}>
                  {chosen === q.correct_index ? "إجابة صحيحة!" : "ليست هذه. الإجابة الصحيحة مظللة بالأخضر."}
                </span>
                <button className="btn btn-primary ms-auto" onClick={nextQuestion} autoFocus>
                  {qIndex + 1 < questions.length ? "السؤال التالي" : "إنهاء"}
                </button>
              </>
            )}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PlayerChrome
        title={title}
        backHref={backHref}
        index={index}
        total={sentences.length}
        prefs={prefs}
        setPrefs={setPrefs}
        options={
          mode === "passage"
            ? ["showTranslation", "showHints", "ignoreCase", "skipPunctuation", "autoPlay", "typingSounds", "rate"]
            : undefined
        }
        settingsOpen={settingsOpen}
        onSettingsChange={setSettingsOpen}
        onHelp={tour.start}
        right={
          mode === "passage" ? (
            <button
              className={`chip ${listenOnly ? "border-accent/40 text-accent" : ""}`}
              onClick={() => setListenOnly((v) => !v)}
              title={listenOnly ? "النص مخفي: اكتب ما تسمعه. اضغط لإظهاره" : "النص ظاهر: اضغط لإخفائه"}
              aria-pressed={!listenOnly}
              data-tour="hide-text"
            >
              {listenOnly ? <IconEyeOff /> : <IconEye />}
              <span className="hidden md:inline">{listenOnly ? "النص مخفي" : "النص ظاهر"}</span>
            </button>
          ) : null
        }
      />
      <Tour steps={tourSteps} open={tour.open} onClose={tour.close} />
      <main className="mx-auto grid max-w-5xl items-start gap-8 px-4 py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-14">
        <Cover
          theme={unit.theme}
          emoji={unit.emoji}
          url={unit.cover_url}
          size="lg"
          className="hidden aspect-[3/4] rounded-2xl lg:block"
        />
        <div>
          <TypingLine
            key={`${sentence.id}:${hidden}`}
            target={sentence.text_en}
            hints={sentence.word_hints}
            prefs={prefs}
            hidden={hidden}
            paused={tour.open || settingsOpen}
            onDone={onSentenceDone}
            onReplay={() => say(sentence.text_en)}
            onEnter={() => justDone && next()}
          />
          {prefs.showTranslation && sentence.text_ar && (
            <p className="mt-6 text-lg leading-8 text-muted" data-tour="translation">
              {sentence.text_ar}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => say(sentence.text_en)} data-tour="listen">
              <IconVolume /> استمع <kbd className="en hidden text-xs text-muted sm:inline">Shift</kbd>
            </button>
            <span data-tour="report">
              <ReportButton unitId={unit.id} itemId={sentence.id} itemType="sentence" context={sentence.text_en} />
            </span>
            {justDone && (
              <button className="btn btn-primary btn-sm ms-auto animate-pop" onClick={next}>
                التالي <kbd className="en text-xs">Enter</kbd>
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
