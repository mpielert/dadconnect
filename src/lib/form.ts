/** Small helpers for reading FormData in server actions. */

export type ActionState = { ok: boolean; error?: string } | null;

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on";
}

export function intOrNull(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
