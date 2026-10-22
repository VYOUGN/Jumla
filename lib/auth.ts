import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";
import type { Profile, UserStats } from "./types";

/** The signed-in user for this request (deduplicated per request), or null. */
export const getViewer = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("id, display_name, role").eq("id", user.id).maybeSingle();
  // Without this log a database problem quietly shows everyone as a regular member.
  if (error) console.error("[jumla] could not read the profile:", error.message);
  const profile: Profile = (data as Profile | null) ?? {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "",
    role: "member",
  };
  return { user, profile, supabase };
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

export const getStats = cache(async (): Promise<UserStats | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { data } = await viewer.supabase.from("user_stats").select("*").eq("user_id", viewer.user.id).maybeSingle();
  return (data as UserStats | null) ?? null;
});
