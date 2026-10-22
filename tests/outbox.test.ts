import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueue, pendingEvents, removeEvents, resetOutboxForTests } from "@/lib/progress/outbox";
import { createSyncer } from "@/lib/progress/sync";
import type { ProgressEvent } from "@/lib/types";

let n = 0;
function ev(userId = "u1"): ProgressEvent {
  n++;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    user_id: userId,
    kind: "sentence",
    item_id: null,
    unit_id: null,
    position: 0,
    accuracy: 1,
    wpm: 30,
    word_count: 4,
    correct: null,
    mission: null,
    local_date: "2026-10-22",
    client_ts: new Date(1_700_000_000_000 + n).toISOString(),
  };
}

const ok = () => new Response(JSON.stringify({ inserted: 1 }), { status: 200 });

beforeEach(async () => {
  resetOutboxForTests();
  const all = [...(await pendingEvents("u1")), ...(await pendingEvents("u2"))];
  await removeEvents(all.map((e) => e.id));
});

describe("outbox", () => {
  it("keeps events per user, oldest first", async () => {
    const a = ev();
    const b = ev("u2");
    const c = ev();
    await enqueue(c);
    await enqueue(a);
    await enqueue(b);
    expect((await pendingEvents("u1")).map((e) => e.id)).toEqual([a.id, c.id]);
    expect((await pendingEvents("u2")).map((e) => e.id)).toEqual([b.id]);
  });
});

describe("syncer", () => {
  it("removes events only after the server confirms", async () => {
    const fetchImpl = vi.fn(async () => ok());
    const s = createSyncer({ userId: "u1", fetchImpl });
    await s.record(ev());
    await s.flush();
    expect(fetchImpl).toHaveBeenCalled();
    expect(await pendingEvents("u1")).toHaveLength(0);
    expect(s.getSnapshot().status).toBe("idle");
    s.stop();
  });

  it("keeps events when the network fails and sends them on retry", async () => {
    let online = false;
    const fetchImpl = vi.fn(async () => {
      if (!online) throw new TypeError("Failed to fetch");
      return ok();
    });
    const s = createSyncer({ userId: "u1", fetchImpl, maxBackoffMs: 100_000 });
    const e = ev();
    await s.record(e);
    await s.flush();
    expect((await pendingEvents("u1")).map((x) => x.id)).toEqual([e.id]);
    expect(s.getSnapshot().status).toBe("error");

    online = true;
    await s.flush();
    expect(await pendingEvents("u1")).toHaveLength(0);
    s.stop();
  });

  it("keeps events on server errors and when signed out", async () => {
    const responses = [new Response("", { status: 503 }), new Response("", { status: 401 })];
    const s = createSyncer({ userId: "u1", fetchImpl: async () => responses.shift() ?? ok(), maxBackoffMs: 100_000 });
    await enqueue(ev());
    await s.flush();
    expect(s.getSnapshot().status).toBe("error");
    await s.flush();
    expect(s.getSnapshot().status).toBe("signed_out");
    expect(await pendingEvents("u1")).toHaveLength(1);
    s.stop();
  });

  it("only sends the signed-in user's events", async () => {
    const bodies: string[] = [];
    const s = createSyncer({
      userId: "u1",
      fetchImpl: async (_url, init) => {
        bodies.push(String(init?.body));
        return ok();
      },
    });
    const mine = ev();
    const theirs = ev("u2");
    await enqueue(mine);
    await enqueue(theirs);
    await s.flush();
    expect(bodies.join("")).toContain(mine.id);
    expect(bodies.join("")).not.toContain(theirs.id);
    expect(await pendingEvents("u2")).toHaveLength(1);
    s.stop();
  });

  it("sends large queues in batches", async () => {
    const sizes: number[] = [];
    const s = createSyncer({
      userId: "u1",
      batchSize: 5,
      fetchImpl: async (_url, init) => {
        sizes.push((JSON.parse(String(init?.body)) as { events: unknown[] }).events.length);
        return ok();
      },
    });
    for (let i = 0; i < 12; i++) await enqueue(ev());
    await s.flush();
    expect(sizes).toEqual([5, 5, 2]);
    s.stop();
  });
});
