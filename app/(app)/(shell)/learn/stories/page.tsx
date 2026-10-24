import type { Metadata } from "next";
import { PageTitle } from "@/components/AppShell";
import { UnitGrid } from "@/components/UnitGrid";
import { requireViewer } from "@/lib/auth";
import { listUnitCards } from "@/lib/content";

export const metadata: Metadata = { title: "القصص" };

export default async function StoriesPage() {
  const { supabase } = await requireViewer();
  const units = await listUnitCards(supabase, "story");
  return (
    <>
      <PageTitle
        title="القصص"
        subtitle="قصص قصيرة من الحياة اليومية. اسمع كل جملة واكتبها حرفاً بحرف، مع الترجمة ومعنى كل كلمة."
      />
      <UnitGrid units={units} />
    </>
  );
}
