import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { requireViewer } from "@/lib/auth";
import { loadPlayer, resumeIndex } from "@/lib/content";
import { nextUnitHref } from "@/lib/player-page";

export const metadata: Metadata = { title: "قصة" };

export default async function StoryPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireViewer();
  const data = await loadPlayer(supabase, user.id, "story", slug);
  if (!data) notFound();
  const done = new Set(data.doneIds);
  return (
    <LessonPlayer
      mode="story"
      unit={data.unit}
      sentences={data.sentences}
      questions={[]}
      doneCount={data.sentences.filter((s) => done.has(s.id)).length}
      startAt={resumeIndex(data.cursor, data.sentences.length)}
      backHref="/learn/stories"
      nextHref={await nextUnitHref(supabase, data.unit)}
    />
  );
}
