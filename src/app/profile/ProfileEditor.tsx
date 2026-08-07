"use client";

import { useActionState } from "react";
import { ProfileFormFields } from "@/components/ProfileFormFields";
import { SubmitButton } from "@/components/SubmitButton";
import type { Member } from "@/lib/types";
import { updateProfile } from "./actions";

export function ProfileEditor({ member }: { member: Member }) {
  const [state, formAction] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="space-y-6">
      <ProfileFormFields defaults={member} />

      <div className="flex items-center gap-4">
        <SubmitButton>Save profile</SubmitButton>
        {state?.ok && (
          <span className="text-sm text-thread">Saved ✓</span>
        )}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}
