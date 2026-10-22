// Sends the outbox to /api/progress. Events are removed only after a 2xx
// response; anything else keeps them and retries with backoff.

import type { ProgressEvent } from "../types";
import { enqueue, pendingEvents, removeEvents } from "./outbox";

export type SyncStatus = "idle" | "syncing" | "offline" | "signed_out" | "error";

export type SyncSnapshot = {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: number | null;
};

type Options = {
  userId: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  batchSize?: number;
  maxBackoffMs?: number;
};

export type Syncer = ReturnType<typeof createSyncer>;

export function createSyncer({
  userId,
  endpoint = "/api/progress",
  fetchImpl = (...args) => fetch(...args),
  batchSize = 50,
  maxBackoffMs = 60_000,
}: Options) {
  let snapshot: SyncSnapshot = { status: "idle", pending: 0, lastSyncedAt: null };
  const listeners = new Set<() => void>();
  let running: Promise<void> | null = null;
  let again = false;
  let backoff = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function update(patch: Partial<SyncSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  }

  function scheduleRetry() {
    if (stopped) return;
    backoff = Math.min(backoff ? backoff * 2 : 2_000, maxBackoffMs);
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => void flush(), backoff);
  }

  async function refreshCount() {
    update({ pending: (await pendingEvents(userId)).length });
  }

  async function run(keepalive: boolean): Promise<void> {
    for (;;) {
      const batch = (await pendingEvents(userId)).slice(0, batchSize);
      if (!batch.length) {
        update({ status: "idle" });
        return;
      }
      update({ status: "syncing", pending: Math.max(snapshot.pending, batch.length) });

      let res: Response;
      try {
        res = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ events: batch }),
          credentials: "same-origin",
          keepalive,
        });
      } catch {
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        update({ status: offline ? "offline" : "error" });
        scheduleRetry();
        return;
      }

      if (res.status === 401) {
        // Kept until the learner signs in again; the provider flushes on sign-in.
        update({ status: "signed_out" });
        return;
      }
      if (!res.ok) {
        update({ status: "error" });
        scheduleRetry();
        return;
      }

      await removeEvents(batch.map((e) => e.id));
      backoff = 0;
      update({ lastSyncedAt: Date.now() });
      if (keepalive) return;
    }
  }

  /** Send everything pending. Concurrent calls share one run and trigger one more pass. */
  async function flush(opts: { keepalive?: boolean } = {}): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          await run(Boolean(opts.keepalive));
        } while (again && snapshot.status === "idle");
      } finally {
        running = null;
        await refreshCount();
      }
    })();
    return running;
  }

  async function record(event: ProgressEvent): Promise<void> {
    await enqueue(event);
    await refreshCount();
    void flush();
  }

  return {
    record,
    flush,
    refreshCount,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Resume automatic retries (after stop). */
    start() {
      stopped = false;
    },
    /** Cancel the pending automatic retry; explicit flush() calls still work. */
    stop() {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
    },
  };
}
