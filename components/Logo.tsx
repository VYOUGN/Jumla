import Link from "next/link";

export function Logo({ href = "/learn" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold" aria-label="Jumla">
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <rect width="64" height="64" rx="16" fill="var(--color-accent)" />
        <path d="M18 40h28M18 28h18" stroke="var(--color-accent-ink)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="44" cy="28" r="3.5" fill="var(--color-accent-ink)" />
      </svg>
      <span className="text-lg">جُملة</span>
    </Link>
  );
}
