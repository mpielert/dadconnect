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
  is_admin: boolean;
  created_at: string;
}

export interface Invite {
  code: string;
  email: string | null;
  invited_name: string | null;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
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
  departed: boolean;
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

// ---------------------------------------------------------------------------
// Career Networking
// ---------------------------------------------------------------------------
export type CareerStatus = "pending" | "accepted" | "declined" | "redirected";

export interface CareerResource {
  member_id: string;
  opted_in: boolean;
  industry: string | null;
  company_or_school: string | null;
  function_area: string | null;
  updated_at: string;
}

export interface CareerRequest {
  request_id: string;
  requester_id: string;
  resource_id: string;
  ask: string;
  status: CareerStatus;
  redirect_note: string | null;
  outcome_note: string | null;
  created_at: string;
}

export const CAREER_STATUS_LABEL: Record<CareerStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  redirected: "Redirected",
};

export const CAREER_STATUS_TONE: Record<
  CareerStatus,
  "brass" | "cardinal" | "thread" | "neutral"
> = {
  pending: "brass",
  accepted: "thread",
  declined: "cardinal",
  redirected: "neutral",
};

// ---------------------------------------------------------------------------
// Crash Pads
// ---------------------------------------------------------------------------
export type HostStatus = "yes" | "maybe" | "no";
export type HostingRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered";

export interface HostingStatus {
  member_id: string;
  status: HostStatus;
  constraints: string | null;
  updated_at: string;
}

export interface HostingRequest {
  request_id: string;
  traveler_id: string;
  host_id: string;
  city: string;
  start_date: string | null;
  end_date: string | null;
  headcount: number | null;
  context: string | null;
  status: HostingRequestStatus;
  counter_note: string | null;
  created_at: string;
}

export const HOST_STATUS_LABEL: Record<HostStatus, string> = {
  yes: "Hosting",
  maybe: "Maybe",
  no: "Not hosting",
};

export const HOST_STATUS_TONE: Record<HostStatus, "thread" | "brass" | "neutral"> =
  {
    yes: "thread",
    maybe: "brass",
    no: "neutral",
  };

export const HOSTING_REQ_STATUS_LABEL: Record<HostingRequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  countered: "Countered",
};

export const HOSTING_REQ_STATUS_TONE: Record<
  HostingRequestStatus,
  "brass" | "thread" | "cardinal" | "neutral"
> = {
  pending: "brass",
  accepted: "thread",
  declined: "cardinal",
  countered: "neutral",
};

// ---------------------------------------------------------------------------
// Travel Sharing
// ---------------------------------------------------------------------------
export interface TravelPost {
  post_id: string;
  author_id: string;
  destination_city: string;
  start_date: string | null;
  end_date: string | null;
  highlights: string;
  has_photos: boolean;
  created_at: string;
}

export interface TravelReply {
  reply_id: string;
  post_id: string;
  author_id: string;
  message: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------
export type ConversationOrigin = "direct" | "crash_pad" | "career";

export interface Conversation {
  conversation_id: string;
  member_a_id: string;
  member_b_id: string;
  origin_kind: ConversationOrigin | null;
  origin_id: string | null;
  created_at: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Connections Chronology
// ---------------------------------------------------------------------------
export type ConnectionContext =
  | "career"
  | "crash_pad"
  | "travel"
  | "directory"
  | "other";

export interface Connection {
  connection_id: string;
  author_id: string;
  with_member_id: string;
  context: ConnectionContext | null;
  summary: string;
  connected_on: string | null;
  created_at: string;
}

export const CONNECTION_CONTEXT_LABEL: Record<ConnectionContext, string> = {
  career: "Career",
  crash_pad: "Crash pad",
  travel: "Travel",
  directory: "Met up",
  other: "Other",
};

export const CONNECTION_CONTEXT_TONE: Record<
  ConnectionContext,
  "brass" | "thread" | "cardinal" | "neutral"
> = {
  career: "brass",
  crash_pad: "thread",
  travel: "cardinal",
  directory: "neutral",
  other: "neutral",
};
