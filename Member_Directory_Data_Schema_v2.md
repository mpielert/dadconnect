# Member Directory — Data Schema
**Version:** 2
**Companion file:** `member_roster_sample_v1.json` (fictional placeholder data — see note at bottom)
**Changed from v1:** Threaded the DadConnect name through; versioning scheme changed to whole numbers.

## Purpose
This is the structured record shape for the roster. Other DadConnect features (crash pads, travel sharing, career networking) reference a member by `memberId` rather than duplicating name/city/contact fields into their own data files — keeps the roster the single source of truth and easy to diff between versions.

## Fields

| Field | Type | Notes |
|---|---|---|
| `memberId` | string | Permanent, never reused even if a member leaves the group. |
| `name` | string | Always populated. |
| `isMinor` | boolean | True for any member under 18. Drives every rule below. |
| `age` | integer or null | **Populated only when `isMinor` is true.** Adults' exact age is not stored/shown — not needed for the directory's purpose. |
| `generation` | `"original"` \| `"next_gen"` | Original CMU group vs. their kids. |
| `classYear` | integer or null | Year joined the CMU circle / graduated, optional, adults only. |
| `city` | string or null | City + state/country level only — **never a street address.** Null for minors. |
| `roleOrSchool` | string or null | Current employer/title, or school/program. Null for minors. |
| `bio` | string or null | Short, self-authored. Null for minors. |
| `contactPreference` | `"in_app"` \| `"email"` \| `"phone"` \| `"none"` | `"none"` for minors — no contact path is exposed for a minor's profile. |
| `visibility` | object of booleans or null | Per-field self-service sharing toggles for adults (`shareCity`, `shareRole`, `shareBio`, `shareContact`). Null for minors — there's nothing optional to toggle since those fields are never collected in the first place. |
| `guardianManaged` | boolean | True for minors. Signals the record can only be created/edited via a parent/guardian's own adult account, not self-service. |
| `profileOwnerId` | string or null | For minors, the `memberId` of the guardian account responsible for their record. Null for adults. |

## Minors policy
For any member under 18: only `name` and `age` are ever collected or displayed, everywhere on DadConnect — not just the directory. `city`, `roleOrSchool`, `bio`, `contactPreference`, and `visibility` are left `null` rather than collected-and-hidden. This keeps it structurally impossible for a minor's city, school, or contact info to leak into a browse view, a search result, or a cross-linked feature (crash pads, travel posts, career networking) even by accident — the fields simply don't exist in their record.

## Sample data note
`member_roster_sample_v1.json` uses entirely fictional placeholder names and details, per project privacy standards — swap in real member data only when you're ready to load it, and only into a version of this file you treat as sensitive (don't commit/share it casually once it's real).
