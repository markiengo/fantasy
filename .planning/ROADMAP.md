# Roadmap: World Cup Fantasy 2026 Frontend Redesign

## Overview

The redesign is structured as vertical MVP phases. Each phase should leave the app reviewable in-browser and preserve the existing backend contract. Current frontend files can be replaced or reorganized, but existing behavior in `docs/use-case.md` is the reference for flows that must survive.

### Phase 1: Design Contract And Rewrite Plan

**Goal:** Lock the redesign direction, information architecture, component inventory, and rewrite boundaries before touching the app shell.
**Mode:** mvp

**UI hint:** yes

**Requirements:** DSGN-01, DSGN-02, DSGN-03

**Success Criteria:**
1. A refreshed UI specification defines the app screens, layout rules, visual tokens, and component states for the redesign.
2. Stale endpoint names and stale frontend contract notes are reconciled against `docs/API.md`.
3. The rewrite boundary is explicit: what current code can be reused, what must be replaced, and what behavior must be preserved.
4. The first implementation plan can cite exact files, components, and browser verification steps.

### Phase 2: Static App Shell

**Goal:** Build the new first-screen app shell with navigation, matchday context, pitch area, side panel, and responsive structure.
**Mode:** mvp

**UI hint:** yes

**Requirements:** SHELL-01, SHELL-02

**Success Criteria:**
1. Opening `frontend/index.html` shows the redesigned app workspace immediately.
2. My Team, Fixtures, and Scores navigation is visible, keyboard reachable, and visually active.
3. The shell includes stable regions for matchday navigation, pitch/squad workspace, side panel, and status/toast messages.
4. The shell renders without content overlap at desktop and mobile widths.

### Phase 3: Local Squad Builder

**Goal:** Rebuild local squad editing with explicit state, player pool controls, formation rules, budget feedback, and draft persistence.
**Mode:** mvp

**UI hint:** yes

**Requirements:** DATA-04, SQUAD-01, SQUAD-02, SQUAD-03, SQUAD-04

**Success Criteria:**
1. Player pool search, filter, and sort controls work against loaded or demo player data.
2. The user can assemble a local 4-3-3 or 4-4-2 squad with immediate rule feedback.
3. The app exposes the current squad mode and validity instead of hiding it in DOM-side effects.
4. Refreshing preserves active matchday and unsaved draft state.

### Phase 4: Backend Wiring And Read Modes

**Goal:** Wire the redesigned shell to live backend data for loading, saving, saved-squad review, fixtures, scores, and explicit API status.
**Mode:** mvp

**UI hint:** yes

**Requirements:** SHELL-03, SHELL-04, DATA-01, DATA-02, DATA-03, SQUAD-05, SQUAD-06, FIXT-01, FIXT-02, FIXT-03, SCOR-01, SCOR-02, SCOR-03

**Success Criteria:**
1. The app fetches players, teams, matches, score, saved squad, and transfer history through live `/api` paths.
2. Saving a complete squad through `POST /api/squad` moves the UI into read-only saved-squad review.
3. Fixtures and scores screens render real backend states, including empty score states.
4. Backend validation errors surface as direct UI messages without triggering demo mode.
5. Demo/mock mode, if retained, is visibly distinct from connected backend mode.

### Phase 5: Transfer Flow

**Goal:** Rebuild transfer mode as a clear staged-swap flow that respects transfer count, budget, window lock, cancel, confirm, and backend reload.
**Mode:** mvp

**UI hint:** yes

**Requirements:** TRAN-01, TRAN-02, TRAN-03, TRAN-04, TRAN-05, TRAN-06

**Success Criteria:**
1. A saved squad can enter transfer mode only when the UI has enough backend state to evaluate transfer availability.
2. Staged swaps are visible as explicit pending changes with budget and transfer-count impact.
3. Cancel restores the saved baseline squad.
4. Confirm sends transfer requests, handles partial failure, and reloads the authoritative squad from the backend.
5. Locked transfer windows are clearly disabled with a reason.

### Phase 6: Polish, Accessibility, And Verification

**Goal:** Hardening pass for responsive layout, accessibility, scoring guide accuracy, visual polish, and manual verification evidence.
**Mode:** mvp

**UI hint:** yes

**Requirements:** SHELL-05, DSGN-04, SCOR-04

**Success Criteria:**
1. Desktop and mobile browser checks show no incoherent overlap, clipped controls, or unreadable text.
2. Keyboard navigation and focus states cover every interactive control.
3. The scoring guide matches `app/core/scoring.py`.
4. Loading, empty, error, success, disabled, hover, active, and focus states are present for all major flows.
5. Manual verification notes document the exact commands, URLs, and viewports used.

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Design Contract And Rewrite Plan | Lock direction and boundaries | 3 | 4 |
| 2 | Static App Shell | Build new first screen | 2 | 4 |
| 3 | Local Squad Builder | Rebuild local editing | 5 | 4 |
| 4 | Backend Wiring And Read Modes | Connect live data and read views | 13 | 5 |
| 5 | Transfer Flow | Rebuild staged transfers | 6 | 5 |
| 6 | Polish, Accessibility, And Verification | Harden and verify | 3 | 5 |

## Coverage

- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

## Notes For Phase Planning

- Start with `$gsd-ui-phase 1` before implementation planning, because Phase 1 is visual and interaction-contract heavy.
- Use `docs/use-case.md` as the current behavior map.
- Use `docs/API.md` as the live API source of truth.
- Use `.planning/codebase/` as the current architecture and risk map.
- Verify in browser after each implementation phase.

---
*Roadmap created: 2026-06-18*
