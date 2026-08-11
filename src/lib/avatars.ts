import { createClient } from "@/lib/supabase/server";

const BUCKET = "avatars";
const TTL_SECONDS = 60 * 60; // 1 hour — well past a page's lifetime

/**
 * Resolve storage paths in the private `avatars` bucket to signed URLs, batched.
 * Returns a Map keyed by the original path (missing/failed paths are omitted).
 */
export async function signAvatarUrls(
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, TTL_SECONDS);

  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

/** Convenience for a single path. */
export async function signAvatarUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  return (await signAvatarUrls([path])).get(path) ?? null;
}
