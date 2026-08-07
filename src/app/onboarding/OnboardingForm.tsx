"use client";

import { useActionState } from "react";
import { ProfileFormFields } from "@/components/ProfileFormFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createOwnProfile } from "./actions";

export function OnboardingForm() {
  const [state, formAction] = useActionState(createOwnProfile, null);

  return (
    <form action={formAction} className="space-y-6">
      <ProfileFormFields />
      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Creating…">Create my profile</SubmitButton>
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}
