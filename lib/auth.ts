import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";
import type { Profile, UserStats } from "./types";

/**
 * The signed-in user for this request (deduplicated per request), or null.
 *
 * getClaims() verifies the session's signature on this server (the project signs
 * sessions with ES256 keys), so unlike getUser() it costs no call to Supabase Auth.
 * The profile and stats then load in parallel: one database round trip, not two.
 * Pages that need the full account record (email changes) call getUser() themselves.
 */
export const getViewer = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };

  // select("*") rather than a column list, so a column added by a newer
  // migration can't break sign-in on a database that hasn't run it yet.
  const [profileRes, statsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  // Without this log a database problem quietly shows everyone as a regular member.
  if (profileRes.error) console.error("[jumla] could not read the profile:", profileRes.error.message);
  const profile: Profile = (profileRes.data as Profile | null) ?? {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "",
    role: "member",
  };
  return { user, profile, stats: (statsRes.data as UserStats | null) ?? null, supabase };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (viewer.profile.role !== "admin") redirect("/learn");
  return viewer;
}

export const getStats = cache(async (): Promise<UserStats | null> => (await getViewer())?.stats ?? null);
