"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Upload / replace / remove your own profile photo. Writes to the private
 * `avatars` bucket under your own "<member_id>/..." folder (storage RLS enforces
 * that), records the path on your members row, then best-effort deletes the
 * previous file. Adults only — minors are photo-free by construction.
 */
export function AvatarUploader({
  memberId,
  name,
  currentPath,
  currentUrl,
}: {
  memberId: string;
  name: string;
  currentPath: string | null;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is over 5 MB — pick a smaller one.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${memberId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const { error: rowErr } = await supabase
      .from("members")
      .update({ photo_path: path })
      .eq("member_id", memberId);
    if (rowErr) {
      setError(rowErr.message);
      setBusy(false);
      return;
    }

    if (currentPath) await supabase.storage.from("avatars").remove([currentPath]);

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rowErr } = await supabase
      .from("members")
      .update({ photo_path: null })
      .eq("member_id", memberId);
    if (rowErr) {
      setError(rowErr.message);
      setBusy(false);
      return;
    }
    if (currentPath) await supabase.storage.from("avatars").remove([currentPath]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={currentUrl} size={64} />
      <div>
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-thread/50 px-3 py-1.5 text-sm text-ink-soft transition hover:border-brass hover:text-ink">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={onPick}
              disabled={busy}
              className="hidden"
            />
            {busy ? "Working…" : currentUrl ? "Change photo" : "Add a photo"}
          </label>
          {currentUrl && !busy && (
            <button
              type="button"
              onClick={onRemove}
              className="text-sm text-ink-soft underline transition hover:text-cardinal"
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          Shown to the group in the directory. JPG or PNG, up to 5 MB.
        </p>
        {error && <p className="mt-1 text-sm text-cardinal">{error}</p>}
      </div>
    </div>
  );
}
