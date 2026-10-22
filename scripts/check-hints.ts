// npm run hints:check -> lists words in content/*.json that have no Arabic hint yet.
import { readFileSync } from "node:fs";
import path from "node:path";
import { lookup, tokenize, wordKey } from "../lib/words";

const dir = path.resolve(__dirname, "..", "content");
const glossary = JSON.parse(readFileSync(path.join(dir, "glossary.json"), "utf8")) as Record<string, string>;
const missing = new Set<string>();
for (const file of ["stories.json", "passages.json"]) {
  for (const u of JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { glossary?: Record<string, string>; sentences: { en: string }[] }[]) {
    const g = { ...glossary, ...(u.glossary ?? {}) };
    for (const s of u.sentences) for (const t of tokenize(s.en)) if (!lookup(g, t)) missing.add(wordKey(t));
  }
}
console.log(missing.size ? [...missing].sort().join(" ") : "All words have hints.");
console.log(`missing: ${missing.size}`);
