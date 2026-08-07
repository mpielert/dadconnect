"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-cardinal px-5 py-2.5 font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
