"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { localDate } from "@/lib/dates";
import { createSyncer, type Syncer, type SyncSnapshot } from "@/lib/progress/sync";
import type { ProgressEvent } from "@/lib/types";

export type NewEvent = Pick<ProgressEvent, "kind"> &
  Partial<Omit<ProgressEvent, "id" | "user_id" | "local_date" | "client_ts" | "kind">>;

type Ctx = {
  userId: string;
  record: (e: NewEvent) => Promise<ProgressEvent>;
  flush: () => Promise<void>;
  snapshot: SyncSnapshot;
};

const ProgressContext = createContext<Ctx | null>(null);

const SERVER_SNAPSHOT: SyncSnapshot = { status: "idle", pending: 0, lastSyncedAt: null };

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Older browsers: RFC 4122 v4 from getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function ProgressProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [syncer] = useState<Syncer>(() => createSyncer({ userId }));

  useEffect(() => {
    syncer.start();
    // Anything left over from an earlier visit (closed tab, offline, expired session) goes now.
    void syncer.refreshCount().then(() => syncer.flush());
    const flushNow = () => void syncer.flush();
    const onHide = () => {
      if (document.visibilityState === "hidden") void syncer.flush({ keepalive: true });
    };
    window.addEventListener("online", flushNow);
    window.addEventListener("focus", flushNow);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    const timer = window.setInterval(flushNow, 30_000);
    return () => {
      window.removeEventListener("online", flushNow);
      window.removeEventListener("focus", flushNow);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.clearInterval(timer);
      syncer.stop();
    };
  }, [syncer]);

  const snapshot = useSyncExternalStore(syncer.subscribe, syncer.getSnapshot, () => SERVER_SNAPSHOT);

  const record = useCallback(
    async (e: NewEvent) => {
      const now = new Date();
      const event: ProgressEvent = {
        item_id: null,
        unit_id: null,
        position: null,
        accuracy: null,
        wpm: null,
        word_count: 0,
        correct: null,
        mission: null,
        ...e,
        id: uuid(),
        user_id: userId,
        local_date: localDate(now),
        client_ts: now.toISOString(),
      };
      await syncer.record(event);
      return event;
    },
    [syncer, userId],
  );

  const value = useMemo<Ctx>(() => ({ userId, record, flush: () => syncer.flush(), snapshot }), [userId, record, syncer, snapshot]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
