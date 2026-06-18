# State: World Cup Fantasy 2026 Frontend Redesign

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-18)

**Core value:** The user can confidently build, review, transfer, and score a legal World Cup fantasy squad without losing track of matchday state, budget, transfer limits, or whether the app is connected to real backend data.

**Current focus:** Phase 1 - Design Contract And Rewrite Plan

## Workflow State

| Item | Status |
|------|--------|
| Project initialized | Complete |
| Codebase map | Complete |
| Requirements defined | Complete |
| Roadmap created | Complete |
| Active phase | Phase 1 |
| Active phase UI-SPEC | Complete |
| Active phase plan | Pending |
| Active phase implementation | Pending |
| Verification | Pending |

## Active Phase

### Phase 1: Design Contract And Rewrite Plan

**Goal:** Lock the redesign direction, information architecture, component inventory, and rewrite boundaries before touching the app shell.

**UI design contract:** `.planning/phase-01-product-shell-and-visual-direction/01-UI-SPEC.md`

**Next recommended command:** `$gsd-plan-phase 1`

**Alternative command:** `$gsd-discuss-phase 1`

## Known Risks

- GSD local tool shim failed during initialization because `C:\Users\marki\.codex\gsd-core\bin\gsd-tools.cjs` could not resolve its expected `package.json`.
- `docs/logic.md` is referenced by repo guidance but missing.
- Current frontend contract docs contain stale endpoint names (`/fixtures`, `/scores`) that conflict with live `/api/matches` and `/api/score`.
- Existing frontend mock mode can mask backend availability problems.
- There are no automated frontend tests or visual regression checks yet.

## Recent Decisions

| Date | Decision | Reason |
|------|----------|--------|
| 2026-06-18 | Initialize GSD project manually from existing docs and codebase map | The GSD shim failed, but planning artifacts were still needed to start the redesign |
| 2026-06-18 | Treat current frontend as behavior reference, not implementation constraint | User asked for a frontend redesign from scratch |
| 2026-06-18 | Start with UI contract work before code rewrite | Redesign needs a stable visual and interaction target |
| 2026-06-18 | Approve Phase 1 UI-SPEC inline | GSD subagent tooling was unavailable, but the design contract is required before planning |

---
*Last updated: 2026-06-18 after Phase 1 UI-SPEC approval*
