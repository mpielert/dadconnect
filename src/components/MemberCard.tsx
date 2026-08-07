import Link from "next/link";
import { Pill } from "./Pill";
import { GENERATION_LABEL, type DirectoryMember } from "@/lib/types";

export function MemberCard({
  member,
  isSelf,
}: {
  member: DirectoryMember;
  isSelf: boolean;
}) {
  const details = member.is_minor
    ? [`age ${member.age ?? "—"}`]
    : [member.city, member.role_or_school].filter(Boolean);

  return (
    <Link
      href={`/directory/${member.member_id}`}
      className="group flex flex-col rounded-xl border border-thread/40 bg-paper-raised p-5 transition hover:border-brass/60 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink group-hover:text-cardinal">
          {member.name}
        </h2>
        <span className="shrink-0 font-mono text-[11px] text-thread">
          {member.member_id}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {isSelf && <Pill tone="cardinal">You</Pill>}
        {member.is_minor ? (
          <Pill tone="thread">Minor</Pill>
        ) : (
          member.generation && (
            <Pill tone="brass">{GENERATION_LABEL[member.generation]}</Pill>
          )
        )}
      </div>

      <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-soft">
        {details.length ? details.join(" · ") : "—"}
      </p>
    </Link>
  );
}
