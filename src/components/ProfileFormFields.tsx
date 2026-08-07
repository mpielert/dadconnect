"use client";

import type { Member } from "@/lib/types";

const labelCls = "block text-sm font-medium text-ink";
const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";
const hintCls = "mt-1 text-xs text-ink-soft";

/**
 * Adult profile fields, shared by onboarding and self-edit. Each shareable
 * field has an adjacent "share with the group" toggle — those map to the
 * members.share_* columns and are enforced in the DB via the directory view,
 * not just here (Handoff §2-3).
 */
export function ProfileFormFields({
  defaults,
}: {
  defaults?: Partial<Member>;
}) {
  const d = defaults ?? {};
  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls} htmlFor="name">
          Name <span className="text-cardinal">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={d.name ?? ""}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="generation">
            Generation
          </label>
          <select
            id="generation"
            name="generation"
            defaultValue={d.generation ?? ""}
            className={inputCls}
          >
            <option value="">—</option>
            <option value="original">Original</option>
            <option value="next_gen">Next Gen</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="class_year">
            Class year
          </label>
          <input
            id="class_year"
            name="class_year"
            type="number"
            inputMode="numeric"
            defaultValue={d.class_year ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <FieldWithToggle
        id="city"
        label="City"
        hint="City or region only — never a street address."
        defaultValue={d.city ?? ""}
        shareName="share_city"
        shareDefault={d.share_city ?? false}
      />

      <FieldWithToggle
        id="role_or_school"
        label="Role or school"
        hint="Current employer/title, or school/program."
        defaultValue={d.role_or_school ?? ""}
        shareName="share_role"
        shareDefault={d.share_role ?? false}
      />

      <div>
        <div className="flex items-center justify-between">
          <label className={labelCls} htmlFor="bio">
            Bio
          </label>
          <ShareToggle name="share_bio" defaultChecked={d.share_bio ?? false} />
        </div>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={d.bio ?? ""}
          className={inputCls}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={labelCls} htmlFor="contact_preference">
            Contact preference
          </label>
          <ShareToggle
            name="share_contact"
            defaultChecked={d.share_contact ?? false}
          />
        </div>
        <select
          id="contact_preference"
          name="contact_preference"
          defaultValue={d.contact_preference ?? "in_app"}
          className={inputCls}
        >
          <option value="in_app">In-app</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="none">No contact</option>
        </select>
        <p className={hintCls}>
          How you&apos;re shown as reachable. Actual contact happens through
          messaging (coming later) — no contact details are stored here.
        </p>
      </div>
    </div>
  );
}

function FieldWithToggle({
  id,
  label,
  hint,
  defaultValue,
  shareName,
  shareDefault,
}: {
  id: string;
  label: string;
  hint: string;
  defaultValue: string;
  shareName: string;
  shareDefault: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelCls} htmlFor={id}>
          {label}
        </label>
        <ShareToggle name={shareName} defaultChecked={shareDefault} />
      </div>
      <input id={id} name={id} defaultValue={defaultValue} className={inputCls} />
      <p className={hintCls}>{hint}</p>
    </div>
  );
}

function ShareToggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-cardinal"
      />
      Share with group
    </label>
  );
}
