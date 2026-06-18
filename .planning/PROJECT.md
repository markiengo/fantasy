# World Cup Fantasy 2026 Frontend Redesign

## What This Is

World Cup Fantasy Football 2026 is a single-user browser app for building an 11-player fantasy squad, managing transfers by matchday, and tracking scores through the 2026 tournament. The backend already exists in FastAPI with raw SQL against Supabase; this project track rebuilds the frontend from scratch in vanilla HTML, CSS, and JavaScript while preserving the live API contract and game rules.

The current `frontend/` implementation is treated as behavioral evidence, not as the design target. The redesign should produce a clearer, more reliable game UI for building squads, reviewing fixtures, making transfers, and understanding points.

## Core Value

The user can confidently build, save, review, and transfer a valid World Cup fantasy squad without losing track of matchday state, budget, rules, or backend/demo status.

## Requirements

### Validated

- The backend exposes live `/api` endpoints for players, teams, matches, squads, transfers, player stats, and score.
- Backend squad and transfer rules are authoritative and already covered by pure validation tests.
- The frontend stack is vanilla HTML, CSS, and JavaScript with no build step.

### Active

- [ ] Redesign the frontend information architecture around the core fantasy workflows: My Team, Fixtures, Scores, and Transfers.
- [ ] Rebuild the app shell, visual system, and responsive layout from scratch while retaining vanilla browser delivery.
- [ ] Implement explicit matchday, squad, formation, budget, and transfer states in frontend logic.
- [ ] Integrate with the live `/api` backend endpoints and surface validation failures directly.
- [ ] Preserve useful current behavior, including local draft recovery, score breakdowns, fixture browsing, and offline/demo review, but remove misleading side effects.

### Out of Scope

- Authentication and multi-user league features - the backend is intentionally single-user for v1.
- Captain, vice-captain, dynamic pricing, and leaderboards - documented v2 ideas, not current backend capabilities.
- Backend schema rewrites - the redesign should consume the existing API unless a blocking contract gap is found.
- Framework migration - use the repo's vanilla HTML/CSS/JS direction unless explicitly changed later.

## Context

- Project docs are mostly Vietnamese, while code identifiers and UI copy are English.
- `AGENTS.md` says the repo is backend-only, but the actual repo contains a working static frontend under `frontend/`.
- `.planning/codebase/` already maps the current backend and frontend architecture, conventions, integrations, and test gaps.
- `docs/API.md` is the live API source of truth and documents that all endpoints are mounted under `/api`.
- `frontend/docs/` contains a prior UI contract and design system. Some parts are stale: `/fixtures` and `/scores` differ from the live `/api/matches` and `/api/score` endpoints, and old mock references use a 15-player squad while this app uses 11.
- `docs/logic.md` is referenced by repo guidance but is currently missing.

## Constraints

- **Tech stack**: Vanilla HTML, CSS, and JavaScript, no frontend build step - matches the existing repo and deployment shape.
- **Backend contract**: FastAPI routes under `/api`; frontend must not assume undocumented endpoint names.
- **Game rules**: Backend validation is authoritative for squad size, formation, max players per team, budget, transfers, and transfer lock timing.
- **Single-user model**: No auth UI in v1; hardcoded backend user remains hidden from the frontend experience.
- **Testing**: Existing automated tests cover backend validation only; frontend verification needs manual browser checks unless tests are added.
- **Runtime dependencies**: Current frontend uses external font/image hosts; the redesign should make these dependencies intentional and visible.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat current frontend as behavior inventory, not target UI | User asked to redesign from scratch, and existing docs call out stale contracts and quirks | Pending |
| Keep vanilla frontend stack | Repo conventions and SRS specify no build step | Pending |
| Use live `docs/API.md` endpoints over older frontend contract names | API.md is newer and matches `/api` mounting in `app/main.py` | Pending |
| Make game modes explicit in frontend state | Current build/view/transfer behavior is important but too coupled to DOM state | Pending |
| Plan the rewrite as vertical MVP phases | The backend exists, so each phase should produce usable frontend behavior | Pending |

## Evolution

After each phase:
1. Move verified requirements from Active to Validated.
2. Add any new frontend contract decisions to Key Decisions.
3. Update Context when API or game-rule assumptions change.
4. Recheck whether the Core Value still captures the redesign priority.

---
*Last updated: 2026-06-18 after initializing the frontend redesign project track*
