"use client";

import { useMemo, useState } from "react";
import { MemberCard } from "@/components/MemberCard";
import type { DirectoryMember, Generation } from "@/lib/types";

type GenFilter = "all" | Generation;

export function DirectoryBrowser({
  members,
  currentMemberId,
}: {
  members: DirectoryMember[];
  currentMemberId: string;
}) {
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<GenFilter>("all");
  const [showMinors, setShowMinors] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (!showMinors && m.is_minor) return false;
      if (gen !== "all") {
        if (m.is_minor) return false;
        if (m.generation !== gen) return false;
      }
      if (!q) return true;
      const haystack = [m.name, m.city, m.role_or_school]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query, gen, showMinors]);

  const genBtn = (value: GenFilter, label: string) => (
    <button
      key={value}
      onClick={() => setGen(value)}
      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
        gen === value
          ? "border-cardinal bg-cardinal text-paper"
          : "border-thread/50 text-ink-soft hover:border-brass"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, city, role…"
          className="w-full flex-1 rounded-lg border border-thread/50 bg-paper px-4 py-2.5 text-ink outline-none focus:border-cardinal"
        />
        <div className="flex flex-wrap items-center gap-2">
          {genBtn("all", "All")}
          {genBtn("original", "Original")}
          {genBtn("next_gen", "Next Gen")}
          <label className="ml-1 flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={showMinors}
              onChange={(e) => setShowMinors(e.target.checked)}
              className="h-4 w-4 accent-cardinal"
            />
            Minors
          </label>
        </div>
      </div>

      <p className="mt-4 font-mono text-xs text-thread">
        {filtered.length} of {members.length} shown
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 text-ink-soft">No members match your filters.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((m) => (
            <MemberCard
              key={m.member_id}
              member={m}
              isSelf={m.member_id === currentMemberId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
