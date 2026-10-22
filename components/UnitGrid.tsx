import Link from "next/link";
import { UNIT_PATHS, type UnitCard } from "@/lib/content";
import { LEVEL_LABELS } from "@/lib/gamification";
import { Cover } from "./Cover";
import { IconCheck } from "./icons";

export function UnitGrid({ units, empty = "لا يوجد محتوى هنا بعد." }: { units: UnitCard[]; empty?: string }) {
  if (!units.length) return <p className="card p-6 text-muted">{empty}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {units.map((u) => (
        <UnitTile key={u.id} unit={u} />
      ))}
    </div>
  );
}

export function UnitTile({ unit: u, cta }: { unit: UnitCard; cta?: string }) {
  const pct = u.total ? Math.round((u.done / u.total) * 100) : 0;
  const finished = u.completions > 0 || (u.total > 0 && u.done >= u.total);
  return (
    <Link
      href={`${UNIT_PATHS[u.type]}/${u.slug}`}
      className="card group flex flex-col overflow-hidden transition-colors hover:border-accent/50"
    >
      <Cover theme={u.theme} emoji={u.emoji} url={u.cover_url} className="h-32" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="chip">
            <span className="en">{u.level}</span> · {LEVEL_LABELS[u.level]}
          </span>
          {finished ? (
            <span className="chip border-ok/40 text-ok">
              <IconCheck /> {u.completions > 1 ? `أنهيتها ${u.completions} مرات` : "منتهية"}
            </span>
          ) : (
            <span className="en">
              {u.done}/{u.total}
            </span>
          )}
        </div>
        <h3 className="en text-lg leading-snug font-semibold">{u.title_en}</h3>
        <p className="text-sm text-muted">{u.title_ar}</p>
        {u.description_ar && <p className="line-clamp-2 text-sm leading-6 text-muted/80">{u.description_ar}</p>}
        <div className="mt-auto pt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          {cta && <span className="mt-3 inline-block text-sm font-semibold text-accent">{cta} ←</span>}
        </div>
      </div>
    </Link>
  );
}
