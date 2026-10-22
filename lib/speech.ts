// English pronunciation through the browser's built-in speech synthesis.

const PREFERRED = ["Google US English", "Samantha", "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy", "Alex"];

let chosen: SpeechSynthesisVoice | null = null;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (!voices.length) return null;
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.toLowerCase() === "en-us") ?? voices[0];
}

if (speechSupported()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    chosen = pickVoice();
  });
}

/** Speak `text`; resolves when it finishes, is cancelled, or speech is unavailable. */
export function speak(text: string, rate = 1): Promise<void> {
  if (!speechSupported() || !text.trim()) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  chosen ??= pickVoice();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (chosen) u.voice = chosen;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
