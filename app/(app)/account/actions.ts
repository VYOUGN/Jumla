"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";

export async function updateDisplayName(formData: FormData) {
  const { supabase, user } = await requireViewer();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) return;
  await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  revalidatePath("/", "layout");
}
