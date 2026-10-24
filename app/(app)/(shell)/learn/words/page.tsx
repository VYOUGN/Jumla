import type { Metadata } from "next";
import { PageTitle } from "@/components/AppShell";
import { UnitGrid } from "@/components/UnitGrid";
import { requireViewer } from "@/lib/auth";
import { listUnitCards } from "@/lib/content";

export const metadata: Metadata = { title: "قوائم الكلمات" };

export default async function WordListsPage() {
  const { supabase } = await requireViewer();
  const units = await listUnitCards(supabase, "word_list");
  return (
    <>
      <PageTitle
        title="قوائم الكلمات"
        subtitle="مفردات مرتبة حسب المستوى. شاهد الكلمة ومعناها ومثالاً عليها، استمع لنطقها، ثم اكتبها."
      />
      <UnitGrid units={units} />
    </>
  );
}
