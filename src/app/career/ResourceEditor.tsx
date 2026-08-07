"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { CareerResource } from "@/lib/types";
import { updateResource } from "./actions";

const labelCls = "block text-sm font-medium text-ink";
const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";

export function ResourceEditor({
  resource,
}: {
  resource: CareerResource | null;
}) {
  const [state, formAction] = useActionState(updateResource, null);

  return (
    <form action={formAction} className="space-y-5">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="opted_in"
          defaultChecked={resource?.opted_in ?? false}
          className="h-5 w-5 accent-cardinal"
        />
        <span className="text-sm font-medium text-ink">
          List me as a career resource
        </span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor="industry">
            Industry
          </label>
          <input
            id="industry"
            name="industry"
            placeholder="e.g. Finance"
            defaultValue={resource?.industry ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="function_area">
            Function
          </label>
          <input
            id="function_area"
            name="function_area"
            placeholder="e.g. Engineering"
            defaultValue={resource?.function_area ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="company_or_school">
            Company / school
          </label>
          <input
            id="company_or_school"
            name="company_or_school"
            defaultValue={resource?.company_or_school ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton>Save</SubmitButton>
        {state?.ok && <span className="text-sm text-thread">Saved ✓</span>}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}
