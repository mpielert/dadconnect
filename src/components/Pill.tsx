type Tone = "neutral" | "brass" | "cardinal" | "thread";

const TONES: Record<Tone, string> = {
  neutral: "border-ink-soft/30 text-ink-soft",
  brass: "border-brass/50 text-brass",
  cardinal: "border-cardinal/50 text-cardinal",
  thread: "border-thread/50 text-thread",
};

/** Monospace ledger-style status/label pill (Handoff §5 signature motif). */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
