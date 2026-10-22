"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveUnit, setUnitArchived, type UnitInput } from "@/app/(app)/admin/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LEVELS, type Level, type Unit, type UnitType } from "@/lib/types";
import { Cover, THEMES } from "../Cover";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function UnitForm({ unit, type }: { unit: Unit | null; type: UnitType }) {
  const router = useRouter();
  const [v, setV] = useState<UnitInput>(() => ({
    id: unit?.id,
    type,
    slug: unit?.slug ?? "",
    title_en: unit?.title_en ?? "",
    title_ar: unit?.title_ar ?? "",
    description_en: unit?.description_en ?? "",
    description_ar: unit?.description_ar ?? "",
    level: unit?.level ?? "A1",
    theme: unit?.theme ?? "teal",
    emoji: unit?.emoji ?? (type === "word_list" ? "🔤" : type === "passage" ? "🎧" : "📖"),
    cover_url: unit?.cover_url ?? null,
    sort_order: unit?.sort_order ?? 0,
    published: unit?.published ?? true,
  }));
  const [slugTouched, setSlugTouched] = useState(Boolean(unit));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<UnitInput>) => setV((x) => ({ ...x, ...patch }));

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await saveUnit(v);
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    setMsg({ ok: true, text: "تم الحفظ. التعديل ظاهر للجميع الآن." });
    if (!unit && r.id) router.replace(`/admin/units/${r.id}`);
    else router.refresh();
  }

  async function onUpload(file: File) {
    setMsg(null);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${unit?.id ?? "new"}/${Date.now()}.${ext}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from("covers").upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setMsg({ ok: false, text: `ما قدرنا نرفع الصورة: ${error.message}` });
      return;
    }
    set({ cover_url: sb.storage.from("covers").getPublicUrl(path).data.publicUrl });
  }

  async function toggleArchive() {
    if (!unit) return;
    if (!unit.archived && !confirm("أرشفة هذا الدرس؟ سيختفي عن المتعلمين، ويبقى تقدّمهم محفوظاً، وتقدر تسترجعه في أي وقت.")) return;
    const r = await setUnitArchived(unit.id, !unit.archived);
    if (r.ok) router.refresh();
    else setMsg({ ok: false, text: r.error });
  }

  return (
    <form onSubmit={onSave} className="card grid gap-5 p-5 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <Cover theme={v.theme} emoji={v.emoji} url={v.cover_url} className="aspect-[4/3] rounded-xl" />
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(THEMES).map(([name, [from, to]]) => (
            <button
              type="button"
              key={name}
              onClick={() => set({ theme: name })}
              className={`size-7 rounded-full border-2 ${v.theme === name ? "border-text" : "border-transparent"}`}
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              aria-label={name}
            />
          ))}
        </div>
        <label className="block">
          <span className="label">رمز (إيموجي)</span>
          <input className="input" value={v.emoji} maxLength={4} onChange={(e) => set({ emoji: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">صورة غلاف (اختياري)</span>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-muted file:me-2 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text"
            onChange={(e) => e.target.files?.[0] && void onUpload(e.target.files[0])}
          />
        </label>
        {v.cover_url && (
          <button type="button" className="text-sm text-muted hover:text-danger" onClick={() => set({ cover_url: null })}>
            إزالة الصورة
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">العنوان بالإنجليزي</span>
          <input
            className="input en"
            dir="ltr"
            required
            value={v.title_en}
            onChange={(e) => set({ title_en: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
          />
        </label>
        <label className="block">
          <span className="label">العنوان بالعربي</span>
          <input className="input" value={v.title_ar} onChange={(e) => set({ title_ar: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">وصف قصير بالعربي</span>
          <textarea className="input" rows={2} value={v.description_ar} onChange={(e) => set({ description_ar: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">وصف قصير بالإنجليزي</span>
          <textarea
            className="input en"
            dir="ltr"
            rows={2}
            value={v.description_en}
            onChange={(e) => set({ description_en: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="label">الرابط (slug)</span>
          <input
            className="input en"
            dir="ltr"
            required
            value={v.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value });
            }}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">المستوى</span>
            <select className="input en" value={v.level} onChange={(e) => set({ level: e.target.value as Level })}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">الترتيب</span>
            <input
              type="number"
              className="input en"
              value={v.sort_order}
              onChange={(e) => set({ sort_order: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-accent)]"
            checked={v.published}
            onChange={(e) => set({ published: e.target.checked })}
          />
          <span>منشور (ظاهر للجميع). أزل العلامة لتجعله مسودة تراها أنت فقط.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary" disabled={busy}>
            {unit ? "حفظ التفاصيل" : "إنشاء"}
          </button>
          {unit && (
            <button type="button" className={unit.archived ? "btn btn-ghost" : "btn btn-danger"} onClick={() => void toggleArchive()}>
              {unit.archived ? "استرجاع من الأرشيف" : "أرشفة"}
            </button>
          )}
          {msg && <span className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</span>}
        </div>
      </div>
    </form>
  );
}
