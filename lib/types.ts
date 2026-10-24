import type { WordHint } from "./words";

export type UnitType = "story" | "passage" | "word_list";
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";

export type Unit = {
  id: string;
  type: UnitType;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  level: Level;
  theme: string;
  emoji: string;
  cover_url: string | null;
  sort_order: number;
  published: boolean;
  archived: boolean;
  updated_at: string;
};

export type Sentence = {
  id: string;
  unit_id: string;
  position: number;
  text_en: string;
  text_ar: string;
  word_hints: WordHint[];
  archived: boolean;
};

export type Question = {
  id: string;
  unit_id: string;
  position: number;
  prompt_en: string;
  prompt_ar: string;
  options: string[];
  correct_index: number;
  archived: boolean;
};

export type Word = {
  id: string;
  unit_id: string;
  position: number;
  word: string;
  translation_ar: string;
  example_en: string;
  example_ar: string;
  archived: boolean;
};

export type Profile = {
  id: string;
  display_name: string;
  role: "admin" | "member";
  /** Guided tours already finished ("home", "lesson"). Missing until migration 0006 runs. */
  tours_seen?: string[];
};

export type UserStats = {
  user_id: string;
  xp: number;
  words_typed: number;
  sentences_done: number;
  sessions: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  freezes: number;
};

export type EventKind = "sentence" | "word" | "question" | "unit_complete" | "mission";

/** One unit of progress. Created on the device, stored in the outbox, then sent to record_events(). */
export type ProgressEvent = {
  id: string;
  user_id: string;
  kind: EventKind;
  item_id: string | null;
  unit_id: string | null;
  position: number | null;
  accuracy: number | null;
  wpm: number | null;
  word_count: number;
  correct: boolean | null;
  mission: string | null;
  /** Typed with the letters hidden (dictation); earns a bonus. Missing on events queued by older versions. */
  hidden?: boolean;
  local_date: string;
  client_ts: string;
};

export type Report = {
  id: string;
  user_id: string;
  unit_id: string | null;
  item_id: string | null;
  item_type: "sentence" | "word" | "question" | "unit";
  message: string;
  status: "open" | "resolved";
  created_at: string;
};

export const UNIT_TYPES: UnitType[] = ["story", "passage", "word_list"];
export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
