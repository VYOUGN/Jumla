// Unit artwork: an uploaded image when there is one, otherwise a gradient with an emoji.

export const THEMES: Record<string, [string, string]> = {
  teal: ["#0f766e", "#164e63"],
  indigo: ["#4338ca", "#1e1b4b"],
  amber: ["#b45309", "#451a03"],
  rose: ["#be123c", "#4c0519"],
  emerald: ["#047857", "#022c22"],
  sky: ["#0369a1", "#082f49"],
  violet: ["#6d28d9", "#2e1065"],
  slate: ["#334155", "#0f172a"],
};

export function Cover({
  theme,
  emoji,
  url,
  className = "",
  size = "md",
}: {
  theme: string;
  emoji: string;
  url?: string | null;
  className?: string;
  size?: "md" | "lg";
}) {
  const [from, to] = THEMES[theme] ?? THEMES.teal;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: url ? `url("${url}")` : `linear-gradient(135deg, ${from}, ${to})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!url && (
        <span
          className={`absolute inset-0 grid place-items-center select-none ${size === "lg" ? "text-8xl" : "text-5xl"}`}
          aria-hidden
        >
          {emoji}
        </span>
      )}
    </div>
  );
}
