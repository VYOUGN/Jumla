"use client";

// Per-device player preferences. These are conveniences, not progress, so the
// browser is the right place for them.

import { useCallback, useEffect, useState } from "react";

export type Prefs = {
  autoPlay: boolean;
  rate: number;
  ignoreCase: boolean;
  skipPunctuation: boolean;
  showTranslation: boolean;
  showHints: boolean;
  dictation: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  autoPlay: true,
  rate: 0.9,
  ignoreCase: true,
  skipPunctuation: true,
  showTranslation: true,
  showHints: true,
  dictation: false,
};

const KEY = "jumla.prefs.v1";

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(read());
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); the change still applies for this visit.
      }
      return next;
    });
  }, []);

  return [prefs, update];
}
