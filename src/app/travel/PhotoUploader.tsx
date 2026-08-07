"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per photo
const MAX_PER_POST = 6;

/**
 * Uploads images to the private `travel-photos` bucket under the member's own
 * folder (storage RLS enforces that), then records rows in travel_photos.
 */
export function PhotoUploader({
  postId,
  memberId,
  existingCount,
}: {
  postId: string;
  memberId: string;
  existingCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PER_POST - existingCount;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setError(null);

    if (files.length > remaining) {
      setError(`You can add ${remaining} more photo${remaining === 1 ? "" : "s"}.`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is over 5 MB.`);
      return;
    }
    const notImage = files.find((f) => !f.type.startsWith("image/"));
    if (notImage) {
      setError(`"${notImage.name}" isn't an image.`);
      return;
    }

    setBusy(true);
    const supabase = createClient();

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${memberId}/${postId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("travel-photos")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) {
        setError(upErr.message);
        setBusy(false);
        return;
      }

      const { error: rowErr } = await supabase
        .from("travel_photos")
        .insert({ post_id: postId, storage_path: path });

      if (rowErr) {
        setError(rowErr.message);
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    e.target.value = "";
    router.refresh();
  }

  if (remaining <= 0) {
    return (
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-thread">
        Photo limit reached
      </p>
    );
  }

  return (
    <div className="mt-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-thread/50 px-3 py-1.5 text-sm text-ink-soft transition hover:border-brass hover:text-ink">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          disabled={busy}
          className="hidden"
        />
        {busy ? "Uploading…" : "Add photos"}
      </label>
      {error && <p className="mt-2 text-sm text-cardinal">{error}</p>}
    </div>
  );
}
