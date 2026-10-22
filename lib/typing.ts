// The typing engine as pure functions: the learner types the target letter by
// letter, a wrong key never advances but counts against accuracy.

import { normalizeApostrophes } from "./words";

export type TypingOptions = {
  ignoreCase: boolean;
  /** Punctuation is filled in automatically so the learner only types letters, digits and spaces. */
  skipPunctuation: boolean;
};

export type TypingState = {
  target: string;
  pos: number;
  keystrokes: number;
  errors: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** Punctuation just filled in for the learner; typing it anyway is not a mistake. */
  skipped: string;
  /** Positions where a wrong key was pressed before the right one. */
  missed: number[];
};

export type TypeResult = "correct" | "wrong" | "ignored" | "done";

const TYPEABLE = /[\p{L}\p{N}\s]/u;
const ARABIC = /\p{Script=Arabic}/u;

export function isSkippable(ch: string, opts: TypingOptions): boolean {
  return opts.skipPunctuation && !TYPEABLE.test(ch);
}

function skipAhead(state: TypingState, opts: TypingOptions): TypingState {
  let { pos, skipped } = state;
  while (pos < state.target.length && isSkippable(state.target[pos], opts)) {
    skipped += state.target[pos];
    pos++;
  }
  return { ...state, pos, skipped };
}

export function createTyping(target: string, opts: TypingOptions): TypingState {
  const clean = normalizeApostrophes(target).replace(/\s+/g, " ").trim();
  return skipAhead(
    { target: clean, pos: 0, keystrokes: 0, errors: 0, startedAt: null, finishedAt: null, skipped: "", missed: [] },
    opts,
  );
}

function same(a: string, b: string, opts: TypingOptions): boolean {
  if (/\s/.test(a) && /\s/.test(b)) return true;
  return opts.ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** True when the key came from an Arabic keyboard layout (we hint instead of counting an error). */
export function isArabicKey(ch: string): boolean {
  return ARABIC.test(ch);
}

export function typeChar(
  state: TypingState,
  rawInput: string,
  opts: TypingOptions,
  now: number,
): { state: TypingState; result: TypeResult } {
  if (state.finishedAt !== null || state.pos >= state.target.length) return { state, result: "ignored" };
  const input = normalizeApostrophes(rawInput);
  if (!input || isArabicKey(input)) return { state, result: "ignored" };

  if (state.skipped && state.skipped.includes(input)) {
    return { state: { ...state, skipped: "" }, result: "ignored" };
  }

  const startedAt = state.startedAt ?? now;
  const expected = state.target[state.pos];

  if (!same(expected, input, opts)) {
    const missed = state.missed.includes(state.pos) ? state.missed : [...state.missed, state.pos];
    return {
      state: { ...state, startedAt, keystrokes: state.keystrokes + 1, errors: state.errors + 1, skipped: "", missed },
      result: "wrong",
    };
  }

  let next: TypingState = { ...state, startedAt, keystrokes: state.keystrokes + 1, pos: state.pos + 1, skipped: "" };
  next = skipAhead(next, opts);
  if (next.pos >= next.target.length) {
    return { state: { ...next, finishedAt: now }, result: "done" };
  }
  return { state: next, result: "correct" };
}

export function accuracy(state: TypingState): number {
  if (state.keystrokes === 0) return 1;
  return Math.max(0, (state.keystrokes - state.errors) / state.keystrokes);
}

/** Words per minute using the usual 5-characters-per-word convention. */
export function wpm(state: TypingState, now: number): number {
  if (state.startedAt === null) return 0;
  const end = state.finishedAt ?? now;
  const minutes = (end - state.startedAt) / 60_000;
  if (minutes < 1 / 60) return 0;
  return Math.round(state.pos / 5 / minutes);
}

export type WordSpan = { start: number; end: number; index: number };

/**
 * Character ranges of the words in the target. `index` matches tokenize(), so it
 * can look up word_hints; pure punctuation tokens get index -1.
 */
export function wordSpans(target: string): WordSpan[] {
  const spans: WordSpan[] = [];
  let index = 0;
  for (const m of target.matchAll(/\S+/g)) {
    const start = m.index ?? 0;
    const hasWord = /[\p{L}\p{N}]/u.test(m[0]);
    spans.push({ start, end: start + m[0].length, index: hasWord ? index : -1 });
    if (hasWord) index++;
  }
  return spans;
}

/** Index (as in tokenize) of the word the cursor is in or about to start. */
export function currentWordIndex(target: string, pos: number): number {
  for (const s of wordSpans(target)) {
    if (s.index >= 0 && pos < s.end) return s.index;
  }
  return -1;
}
