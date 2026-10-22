// Typing sound effects, synthesized with the Web Audio API (no audio files).

type Tone = { freq: number; endFreq?: number; type: OscillatorType; duration: number; gain: number; delay?: number };

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ freq, endFreq, type, duration, gain, delay = 0 }: Tone) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  /** A soft click for a correct letter (slightly varied so it doesn't feel mechanical). */
  key() {
    tone({ freq: 1500 + Math.random() * 250, type: "triangle", duration: 0.03, gain: 0.045 });
  },
  /** A short low buzz for a wrong letter. */
  wrong() {
    tone({ freq: 230, endFreq: 140, type: "square", duration: 0.13, gain: 0.035 });
  },
  /** Two rising notes when a sentence or word is complete. */
  done() {
    tone({ freq: 660, type: "sine", duration: 0.14, gain: 0.07 });
    tone({ freq: 990, type: "sine", duration: 0.2, gain: 0.07, delay: 0.1 });
  },
};
