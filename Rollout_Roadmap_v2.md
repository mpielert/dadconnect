# Rollout Roadmap
**Version:** 2
**Status:** Draft for review
**Changed from v1.1:** Renamed under the new whole-number versioning scheme (v1, v2, v3…), and the remaining generic "the platform" references now read "DadConnect."

## Sequencing logic
Ship what makes DadConnect useful to the smallest group first, then layer on features that need more members actively participating to pay off. A directory is useful with just a handful of profiles.

## Phase 1 — Foundation
**Goal:** Everyone in the group (and their kids) has a profile and can find each other.
- Member Directory (PRD v2): onboarding, profiles, search/browse, privacy controls, minors policy
- Basic in-app contact (1:1 messaging or "reveal contact info" flow) — a shared primitive the other three features reuse, so it's built once here rather than per-feature.

**Dependency:** Everything downstream depends on this. Nothing else should start until profiles + contact flow are solid.

## Phase 2 — Career Networking
**Goal:** Get DadConnect's highest-value feature for the kids live early, while the group is freshest and most engaged right after launch.
- Career Networking (PRD v2): opt-in resource tagging, structured requests, accept/connect flow

**Why second (changed from the original ordering):** This was originally sequenced last as the highest-effort feature, needing the most profile detail to be useful. Moving it to Phase 2 trades that off deliberately — it's the feature most likely to make DadConnect feel indispensable to the next generation specifically, so it's worth front-loading even though it asks more of members up front (real industry/company/function detail, not just a city and a status toggle). Worth watching after launch whether profile completeness is actually there to support it, or whether this phase needs a nudge campaign to get people to fill in career fields.

## Phase 3 — Crash Pads
**Goal:** A concrete, low-effort feature that gets people using the app for something tangible.
- Crash Pads (PRD v2): hosting status toggle, request/accept flow, gated address sharing

**Why third:** Still the lowest-effort feature to opt into (a status toggle, no content creation) — that hasn't changed. It's now sequenced after Career Networking rather than before it.

## Phase 4 — Travel Sharing
**Goal:** The group builds a shared knowledge base once the habit of using the app is established.
- Travel Sharing (PRD v2): trip posts, browse by destination, light cross-link to crash pad availability

**Why last:** Needs the most ongoing content-creation habit (people have to actually post), so it benefits most from the group already being active from the earlier phases. Also technically depends on Crash Pads existing for its cross-link prompt, so it can't move ahead of Phase 3 regardless of priority.

## Open dependency notes
- All four phases still depend on the Phase 1 privacy/consent decisions (field-level visibility, minors policy) being resolved — already locked in as of PRD v2.
- Travel Sharing's cross-link to Crash Pads means Phase 4 has a hard dependency on Phase 3 shipping first — this is the one ordering constraint that isn't just a priority call.
- Native iOS app vs. responsive web: still recommend validating all four feature areas as a web app first, then deciding whether a native app is worth the investment.
