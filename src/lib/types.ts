export type Generation = "original" | "next_gen";
export type ContactPreference = "in_app" | "email" | "phone" | "none";

/** A full `members` row (only ever your own row or a minor you guardian). */
export interface Member {
  member_id: string;
  auth_user_id: string | null;
  name: string;
  is_minor: boolean;
  age: number | null;
  generation: Generation | null;
  class_year: number | null;
  city: string | null;
  role_or_school: string | null;
  bio: string | null;
  contact_preference: ContactPreference | null;
  share_city: boolean | null;
  share_role: boolean | null;
  share_bio: boolean | null;
  share_contact: boolean | null;
  guardian_managed: boolean;
  profile_owner_id: string | null;
  created_at: string;
}

/**
 * A row from the `member_directory` view — field-masked at the database level.
 * A null `city`/`role_or_school`/`bio`/`contact_preference` means either the
 * member hasn't shared it or the field doesn't apply (minors).
 */
export interface DirectoryMember {
  member_id: string;
  name: string;
  is_minor: boolean;
  age: number | null;
  generation: Generation | null;
  class_year: number | null;
  city: string | null;
  role_or_school: string | null;
  bio: string | null;
  contact_preference: ContactPreference | null;
  guardian_managed: boolean;
  profile_owner_id: string | null;
}

export const GENERATION_LABEL: Record<Generation, string> = {
  original: "Original",
  next_gen: "Next Gen",
};

export const CONTACT_LABEL: Record<ContactPreference, string> = {
  in_app: "In-app",
  email: "Email",
  phone: "Phone",
  none: "No contact",
};
