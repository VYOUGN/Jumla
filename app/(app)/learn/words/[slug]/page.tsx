import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WordsPlayer } from "@/components/player/WordsPlayer";
import { requireViewer } from "@/lib/auth";
import { loadPlayer, resumeIndex } from "@/lib/content";
import { nextUnitHref } from "@/lib/player-page";

export const metadata: Metadata = { title: "قائمة كلمات" };

export default async function WordsPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireViewer();
  const data = await loadPlayer(supabase, user.id, "word_list", slug);
  if (!data) notFound();
  const done = new Set(data.doneIds);
  return (
    <WordsPlayer
      unit={data.unit}
      words={data.words}
      doneCount={data.words.filter((w) => done.has(w.id)).length}
      startAt={resumeIndex(data.cursor, data.words.length)}
      backHref="/learn/words"
      nextHref={await nextUnitHref(supabase, data.unit)}
    />
  );
}
