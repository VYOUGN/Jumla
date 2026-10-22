import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;

// Receives queued events from a device. A 2xx tells the device it may delete
// them; anything else makes it keep them and retry.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const events = (body as { events?: unknown })?.events;
  if (!Array.isArray(events) || events.length > MAX_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 });
  }
  if (!events.length) return NextResponse.json({ inserted: 0 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("record_events", { p_events: events });
  if (error) {
    const signedOut = error.code === "28000" || error.message.includes("not_authenticated");
    return NextResponse.json(
      { error: signedOut ? "signed_out" : "unavailable" },
      { status: signedOut ? 401 : 503 },
    );
  }
  return NextResponse.json({ inserted: data ?? 0 });
}
