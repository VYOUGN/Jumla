// Splitting English text into words, shared by the typing engine, the admin
// "auto hints" button and the seed builder so they always agree.

export type WordHint = { w: string; ar: string };

const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function normalizeApostrophes(text: string): string {
  return text.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}

/** Words of a sentence without surrounding punctuation ("Hello," -> "Hello"). */
export function tokenize(text: string): string[] {
  return normalizeApostrophes(text)
    .split(/\s+/)
    .map((t) => t.replace(EDGE_PUNCT, ""))
    .filter(Boolean);
}

export function wordKey(word: string): string {
  return normalizeApostrophes(word).toLowerCase();
}

/** Look a word up in a glossary, trying a few simple English variants. */
export function lookup(glossary: Record<string, string>, word: string): string {
  const key = wordKey(word);
  if (glossary[key]) return glossary[key];
  if (key.endsWith("'s") && glossary[key.slice(0, -2)]) return glossary[key.slice(0, -2)];
  return "";
}

/**
 * Hints aligned with tokenize(text). Existing hints are reused by word so an
 * admin's translations survive when they fix a typo elsewhere in the sentence.
 */
export function buildHints(
  text: string,
  glossary: Record<string, string> = {},
  previous: WordHint[] = [],
): WordHint[] {
  const known = new Map<string, string>();
  for (const h of previous) if (h.ar) known.set(wordKey(h.w), h.ar);
  return tokenize(text).map((w) => ({ w, ar: known.get(wordKey(w)) ?? lookup(glossary, w) }));
}

export function countWords(text: string): number {
  return tokenize(text).length;
}
