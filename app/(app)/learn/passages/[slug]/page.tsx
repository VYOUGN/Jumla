import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { requireViewer } from "@/lib/auth";
import { loadPlayer, resumeIndex } from "@/lib/content";
import { nextUnitHref } from "@/lib/player-page";

export const metadata: Metadata = { title: "نص استماع" };

export default async function PassagePlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user, profile } = await requireViewer();
  const data = await loadPlayer(supabase, user.id, "passage", slug);
  if (!data) notFound();
  const done = new Set(data.doneIds);
  return (
    <LessonPlayer
      mode="passage"
      unit={data.unit}
      sentences={data.sentences}
      questions={data.questions}
      doneCount={data.sentences.filter((s) => done.has(s.id)).length}
      startAt={resumeIndex(data.cursor, data.sentences.length)}
      backHref="/learn/passages"
      nextHref={await nextUnitHref(supabase, data.unit)}
      toursSeen={profile.tours_seen ?? []}
    />
  );
}
