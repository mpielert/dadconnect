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
      {/*
        Re-key on the persisted values so the fields remount after a save. React
        19 auto-resets the form when the action completes; without this, the
        uncontrolled selects (generation, contact preference) and the share
        toggles would visibly snap back to their original values even though the
        save succeeded. Remounting makes them re-read the freshly saved data.
        (Onboarding uses ProfileFormFields without this and is unaffected.)
      */}
      <ProfileFormFields key={JSON.stringify(member)} defaults={member} />

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
