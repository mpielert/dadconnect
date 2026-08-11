/**
 * Round avatar with an initials fallback. Presentational only. `src` is a signed
 * URL (avatars live in a private bucket); when absent, shows the member's
 * initials on a neutral disc.
 */
export function Avatar({
  name,
  src,
  size = 44,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const dimension = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={dimension}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ ...dimension, fontSize: Math.round(size * 0.4) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-thread/20 font-display font-semibold text-ink-soft"
    >
      {initials}
    </span>
  );
}
