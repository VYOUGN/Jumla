import { describe, expect, it } from "vitest";
import { accuracy, createTyping, currentWordIndex, typeChar, wpm, type TypingOptions, type TypingState } from "@/lib/typing";

const opts: TypingOptions = { ignoreCase: true, skipPunctuation: true };

function typeAll(state: TypingState, text: string, o = opts, t0 = 0) {
  let s = state;
  const results: string[] = [];
  [...text].forEach((ch, i) => {
    const r = typeChar(s, ch, o, t0 + i * 100);
    s = r.state;
    results.push(r.result);
  });
  return { state: s, results };
}

describe("typing engine", () => {
  it("advances on correct letters and finishes", () => {
    const { state, results } = typeAll(createTyping("Hi you", opts), "hi you");
    expect(results.at(-1)).toBe("done");
    expect(state.finishedAt).not.toBeNull();
    expect(accuracy(state)).toBe(1);
  });

  it("does not advance on a wrong letter but counts it", () => {
    let s = createTyping("cat", opts);
    s = typeChar(s, "c", opts, 0).state;
    const r = typeChar(s, "x", opts, 10);
    expect(r.result).toBe("wrong");
    expect(r.state.pos).toBe(1);
    expect(r.state.errors).toBe(1);
    const done = typeAll(r.state, "at", opts, 20).state;
    expect(done.finishedAt).not.toBeNull();
    expect(accuracy(done)).toBeCloseTo(3 / 4);
  });

  it("fills in punctuation and forgives typing it anyway", () => {
    let s = createTyping("Yes, I don’t know.", opts);
    s = typeAll(s, "yes").state;
    // the comma was skipped automatically; typing it is ignored, not an error
    const comma = typeChar(s, ",", opts, 1000);
    expect(comma.result).toBe("ignored");
    s = typeAll(comma.state, " i don").state;
    const apostrophe = typeChar(s, "'", opts, 2000);
    expect(apostrophe.result).toBe("ignored");
    const end = typeAll(apostrophe.state, "t know");
    expect(end.results.at(-1)).toBe("done");
    expect(end.state.errors).toBe(0);
  });

  it("respects case when asked", () => {
    const strict = { ...opts, ignoreCase: false };
    const r = typeChar(createTyping("Ok", strict), "o", strict, 0);
    expect(r.result).toBe("wrong");
  });

  it("ignores keys from an Arabic keyboard layout", () => {
    const r = typeChar(createTyping("hello", opts), "ا", opts, 0);
    expect(r.result).toBe("ignored");
    expect(r.state.keystrokes).toBe(0);
  });

  it("computes words per minute", () => {
    let s = createTyping("abcde abcde", opts);
    s = typeAll(s, "abcde abcde", opts, 0).state;
    s = { ...s, startedAt: 0, finishedAt: 60_000 };
    expect(wpm(s, 60_000)).toBe(2);
  });

  it("finds the current word for hints, skipping pure punctuation", () => {
    const t = "Wait - I am here";
    expect(currentWordIndex(t, 0)).toBe(0);
    expect(currentWordIndex(t, 7)).toBe(1); // "I"
    expect(currentWordIndex(t, 9)).toBe(2); // "am"
  });
});
