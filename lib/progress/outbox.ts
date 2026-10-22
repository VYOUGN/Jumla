// The device-side outbox. Every progress event lands here first and is only
// removed after the server has confirmed it, so closing the tab, losing the
// connection or an expired session can delay saving but never lose it.

import { createStore, delMany, get, set, values, type UseStore } from "idb-keyval";
import type { ProgressEvent } from "../types";

const LS_KEY = "jumla.outbox.v1";

type Backend = {
  put(e: ProgressEvent): Promise<void>;
  all(): Promise<ProgressEvent[]>;
  remove(ids: string[]): Promise<void>;
};

const idbBackend = (store: UseStore): Backend => ({
  put: (e) => set(e.id, e, store),
  all: () => values<ProgressEvent>(store),
  remove: (ids) => delMany(ids, store),
});

// Fallback for browsers without a working IndexedDB (some private modes).
const localStorageBackend: Backend = {
  async put(e) {
    const map = readLs();
    map[e.id] = e;
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  },
  async all() {
    return Object.values(readLs());
  },
  async remove(ids) {
    const map = readLs();
    for (const id of ids) delete map[id];
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  },
};

function readLs(): Record<string, ProgressEvent> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, ProgressEvent>;
  } catch {
    return {};
  }
}

let backend: Promise<Backend> | null = null;

function getBackend(): Promise<Backend> {
  backend ??= (async () => {
    try {
      const store = createStore("jumla-progress", "outbox");
      await get("__probe__", store);
      return idbBackend(store);
    } catch {
      return localStorageBackend;
    }
  })();
  return backend;
}

/** For tests: forget the chosen backend so a fresh IndexedDB is used. */
export function resetOutboxForTests(): void {
  backend = null;
}

export async function enqueue(event: ProgressEvent): Promise<void> {
  const b = await getBackend();
  try {
    await b.put(event);
  } catch {
    // IndexedDB can fail mid-session (quota, eviction); keep the event anyway.
    await localStorageBackend.put(event);
  }
}

/** Events waiting to be sent for this user, oldest first. */
export async function pendingEvents(userId: string): Promise<ProgressEvent[]> {
  const b = await getBackend();
  const fromIdb = await b.all().catch(() => [] as ProgressEvent[]);
  const fromLs = b === localStorageBackend ? [] : await localStorageBackend.all().catch(() => [] as ProgressEvent[]);
  const byId = new Map<string, ProgressEvent>();
  for (const e of [...fromIdb, ...fromLs]) byId.set(e.id, e);
  return [...byId.values()]
    .filter((e) => e.user_id === userId)
    .sort((a, b) => a.client_ts.localeCompare(b.client_ts));
}

export async function removeEvents(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const b = await getBackend();
  await b.remove(ids);
  if (b !== localStorageBackend && typeof localStorage !== "undefined") {
    await localStorageBackend.remove(ids).catch(() => undefined);
  }
}
