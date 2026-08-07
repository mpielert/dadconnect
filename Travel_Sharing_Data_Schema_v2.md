# Travel Sharing — Data Schema
**Version:** 2
**Companion file:** `travel_post_sample_v1.json`
**Depends on:** Member Directory Data Schema (v2)
**Changed from v1:** Threaded the DadConnect name through; versioning scheme changed to whole numbers.

## Purpose
Structures trip posts and the replies underneath them on DadConnect. References members by `memberId` only — same pattern as Crash Pads — so the roster stays the single source of truth.

Per DadConnect's platform-wide minors policy, **minors never appear in this file.** Posting a trip requires the same kind of self-service account minors don't get, so travel sharing simply doesn't apply to minor profiles in v1 — consistent with how the Member Directory PRD treats every feature that would otherwise show a minor's activity or location.

## `posts[]` — one entry per trip post

| Field | Type | Notes |
|---|---|---|
| `postId` | string | Permanent, never reused. |
| `authorId` | string | FK to roster. Adults only. |
| `destinationCity` | string | City + state/country level — same granularity as the roster's `city` field, never a street address. |
| `startDate` / `endDate` | string (ISO date) or null | Optional — a post can be general destination knowledge rather than a specific trip. |
| `highlights` | string | Free text: recommendations, tips, what to skip. |
| `hasPhotos` | boolean | v1 only tracks *whether* a post has a couple of photos attached, not the images themselves — real image storage is deferred until there's a real backend, consistent with not building a working data/storage layer at prototype stage. |
| `createdAt` | string (ISO date) | Drives the "most recent first" sort in the PRD's core flow. |

## `replies[]` — one entry per reply/question on a post

| Field | Type | Notes |
|---|---|---|
| `replyId` | string | Permanent, never reused. |
| `postId` | string | FK to `posts[]`. |
| `authorId` | string | FK to roster — who asked or replied. |
| `message` | string | Free text. |
| `createdAt` | string (ISO date) | |

## Crash-pad cross-link (presentation only, not stored data)
The PRD calls for a light prompt when a post's destination has a member open to hosting there ("Sue lives in Lisbon — check crash pad availability"). This is computed at render time by checking a post's `destinationCity` against Crash Pads' `hostingStatus[]` (see `Crash_Pads_Data_Schema_v2.md`) — it is **not** a field stored in this file, so the two features never get out of sync from duplicated data.

## Sample data note
`travel_post_sample_v1.json` uses the same fictional placeholder members as the roster and crash-pad samples, per project privacy standards.
