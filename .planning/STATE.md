# State: World Cup Fantasy 2026 Frontend Redesign

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-18)

**Core value:** The user can confidently build, save, review, and transfer a valid World Cup fantasy squad without losing track of matchday state, budget, rules, or backend/demo status.
**Current focus:** Phase 1 - Product Shell and Visual Direction

## Current Phase

| Field | Value |
|-------|-------|
| Phase | 1 |
| Name | Product Shell and Visual Direction |
| Status | Ready for discussion |
| Mode | mvp |
| UI hint | yes |

## Workflow Status

- Project initialized from existing codebase map and docs.
- GSD local shim could not run because `C:\Users\marki\.codex\gsd-core\bin\gsd-tools.cjs` failed to load its expected `package.json`.
- Artifacts were created inline instead of through the shim.
- Next recommended command: `$gsd-ui-phase 1`, then `$gsd-plan-phase 1`.

## Important Context

- The repo has an existing `frontend/` implementation despite older instructions saying frontend does not exist yet.
- The redesign should rebuild from scratch but preserve proven behavior from `docs/use-case.md`.
- Use `docs/API.md` live endpoint names, including `/api/matches` and `/api/score`.
- `docs/logic.md` is missing even though repo guidance references it.
- Frontend and backend transfer-lock timing may disagree and needs resolution before transfer UX is finalized.

## Open Risks

- GSD tool installation is incomplete or incompatible with the current local Node/runtime layout.
- Current `.planning/codebase/` files and `AGENTS.md` are untracked in git.
- Existing frontend docs contain stale paths and design assumptions; implementation phases must verify against code and live API docs.
- No automated frontend tests exist yet.

## Next Up

1. Run `$gsd-ui-phase 1` to create a UI design contract for Phase 1.
2. Run `$gsd-plan-phase 1` to produce the implementation plan.
3. During Phase 1, audit current frontend files before deleting or replacing behavior.

---
*State initialized: 2026-06-18*
