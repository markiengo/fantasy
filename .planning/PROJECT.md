# World Cup Fantasy 2026 Frontend Redesign

## What This Is

World Cup Fantasy 2026 is a single-user browser app for building an 11-player World Cup fantasy squad, making matchday transfers, reviewing fixtures, and tracking points. This project track is a frontend redesign from scratch over the existing FastAPI and Supabase backend, using the current frontend only as behavioral reference and API-contract evidence.

## Core Value

The user can confidently build, review, transfer, and score a legal World Cup fantasy squad without losing track of matchday state, budget, transfer limits, or whether the app is connected to real backend data.

## Requirements

### Validated

- The backend API exists and exposes player, team, match, squad, transfer, playerstat, and score endpoints under `/api`.
- Single-user mode is intentional; the frontend should not introduce authentication for v1.
- The current static frontend proves the browser-only vanilla HTML, CSS, and JavaScript stack is viable.
- Client-side rule checks are useful for feedback, but backend validation remains authoritative.

### Active

- [ ] Redesign the frontend from scratch using vanilla HTML, CSS, and JavaScript with no build step.
- [ ] Preserve the existing backend API contract and `/api` prefix.
- [ ] Rebuild the app as a usable single-page product surface, not a marketing page.
- [ ] Make `build`, `view`, and `transfer` squad modes explicit in UI and state.
- [ ] Provide a premium, sport-focused design system that avoids generic dashboard patterns.
- [ ] Make real backend mode, loading states, empty states, validation errors, and demo/mock fallback obvious.
- [ ] Verify the redesigned frontend in browser at desktop and mobile widths.

### Out of Scope

- Authentication - v1 is single-user by design.
- Multiplayer, leagues, and leaderboards - backend and SRS defer these beyond v1.
- Live score streaming - current scoring reads stored stats after insertion.
- Dynamic pricing - v1 prices are static.
- Captain or vice-captain multipliers - explicitly deferred in existing docs.
- Backend schema or API rewrites - redesign should adapt to current endpoints unless a blocker is found.

## Context

- Backend stack: FastAPI, raw SQL through psycopg2, hosted Supabase PostgreSQL.
- Frontend stack: plain HTML, CSS, and browser JavaScript. No framework or bundler is currently planned.
- Existing frontend files live under `frontend/`, with modules for app bootstrap, API calls, state, squad, transfers, fixtures, scores, charts, onboarding, and UI helpers.
- Existing frontend docs include a visual direction, UI contract, and design system, but they include drift and stale references.
- `.planning/codebase/` already maps the current architecture, conventions, integrations, testing gaps, and structure.
- `docs/logic.md` is referenced by repo guidance but is missing. Use `docs/SRS.md`, `docs/API.md`, `docs/use-case.md`, backend code, and tests as current sources of truth.

## Constraints

- **Tech stack**: Vanilla HTML, CSS, and JavaScript - no frontend framework unless the user explicitly changes direction.
- **API contract**: Use live backend paths under `/api`, especially `/api/matches` and `/api/score` instead of stale `/fixtures` or `/scores` names.
- **Rules authority**: Backend validation wins; frontend validation is only immediate feedback.
- **Single user**: Keep user identity hardcoded or presentation-only; do not design login flows for v1.
- **Data shape**: Rows returned by backend are dict-shaped JSON with named fields; avoid tuple-style assumptions.
- **Design**: Build the actual app experience first. Avoid landing-page composition, decorative card overload, and hidden app functionality.
- **Testing**: Existing automated coverage is backend validation only. Frontend verification must include manual/browser checks until tests are added.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as a frontend redesign track, not a new backend product | Backend domain and API are already established | Pending |
| Use the current frontend as behavior reference, not code to preserve | User asked for a redesign from scratch, and current docs note UI-coupled quirks | Pending |
| Keep vanilla frontend stack | Matches repo contract and avoids build tooling churn | Pending |
| Make squad modes explicit | Current mode behavior is central and easy to break during a rewrite | Pending |
| Make backend/demo state visible | Current mock fallback can mask backend outages | Pending |

## Evolution

After each phase:

1. Move shipped and verified requirements from Active to Validated.
2. Move descoped ideas to Out of Scope with a reason.
3. Add new frontend decisions to Key Decisions.
4. Recheck whether Core Value still reflects the redesign priority.

---
*Last updated: 2026-06-18 after frontend redesign project initialization*
