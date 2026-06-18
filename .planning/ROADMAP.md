# Roadmap: World Cup Fantasy 2026 Frontend Redesign

**Created:** 2026-06-18
**Mode:** Vertical MVP

## Phase Overview

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Product Shell and Visual Direction | Replace the current UI foundation with a responsive app shell and design system | SHELL-01, SHELL-02, SHELL-03, SHELL-04, DSGN-01, DSGN-02, DSGN-03, DSGN-04 |
| 2 | Frontend State and API Backbone | Build the app state model and centralized `/api` client before feature screens depend on them | API-01, API-02, API-03, API-04, MATCH-01, MATCH-02 |
| 3 | Squad Builder MVP | Let the user build, validate, save, and recover an 11-player squad | SQUAD-01, SQUAD-02, SQUAD-03, SQUAD-04, SQUAD-05, SQUAD-06 |
| 4 | Transfer Workflow | Replace hidden diff-based transfer behavior with explicit swap review and confirmation | TRNF-01, TRNF-02, TRNF-03, TRNF-04, TRNF-05, TRNF-06 |
| 5 | Fixtures and Scores | Ship the non-squad screens and score explanations against live endpoints | FIXT-01, FIXT-02, FIXT-03, SCOR-01, SCOR-02, SCOR-03, SCOR-04, MATCH-03 |
| 6 | Verification and Release Hardening | Verify responsive UI, state transitions, API errors, and release readiness | VERF-01, VERF-02, VERF-03 |

## Phase Details

### Phase 1: Product Shell and Visual Direction
**Goal:** Establish the redesigned frontend foundation before rebuilding workflows.
**Mode:** mvp
**UI hint:** yes
**Requirements:** SHELL-01, SHELL-02, SHELL-03, SHELL-04, DSGN-01, DSGN-02, DSGN-03, DSGN-04

**Success Criteria**:
1. The first screen is the usable fantasy app shell, not a marketing or placeholder page.
2. My Team, Fixtures, and Scores navigation renders responsively with no text overlap on desktop or mobile widths.
3. The design system defines tokens for color, typography, spacing, motion, focus, and component states.
4. Loading, empty, error, disabled, hover, active, and success states are represented in the component plan.
5. Stale assumptions from older frontend docs are removed from visible UI and implementation notes.

**Notes**:
- Audit current `frontend/index.html`, `frontend/css/`, and `frontend/js/` before deleting or replacing behavior.
- Preserve useful assets only if they serve the new design direction.

### Phase 2: Frontend State and API Backbone
**Goal:** Create the state and backend access layer that all redesigned screens share.
**Mode:** mvp
**UI hint:** yes
**Requirements:** API-01, API-02, API-03, API-04, MATCH-01, MATCH-02

**Success Criteria**:
1. All backend calls go through one API client that consistently uses `/api`.
2. `400`, `404`, `500`, and network failures produce distinct UI states.
3. Live backend mode and demo/mock mode are visually explicit.
4. Matchday selection updates shared state predictably.
5. Transfer lock status uses backend-compatible matchday timing rules or clearly documents any remaining mismatch.

**Notes**:
- Current docs mention a frontend lock rule based on kickoff minus one hour, while backend notes are date-based. Resolve before wiring transfer UX.

### Phase 3: Squad Builder MVP
**Goal:** Deliver the core app value: build and save a valid fantasy squad.
**Mode:** mvp
**UI hint:** yes
**Requirements:** SQUAD-01, SQUAD-02, SQUAD-03, SQUAD-04, SQUAD-05, SQUAD-06

**Success Criteria**:
1. Player pool search, filters, and sorting work against loaded player data.
2. The pitch shows selected players, empty slots, formation, budget, team-limit, and selected-count feedback.
3. The user can choose 4-3-3 or 4-4-2 intentionally.
4. Save is enabled only for a complete legal squad and posts to `POST /api/squad`.
5. Refreshing the browser can restore an unsaved draft without confusing it for a saved squad.

**Notes**:
- Client validation should improve feedback, but backend validation remains authoritative.

### Phase 4: Transfer Workflow
**Goal:** Make transfers explicit, reviewable, and aligned with the current one-transfer-per-request backend contract.
**Mode:** mvp
**UI hint:** yes
**Requirements:** TRNF-01, TRNF-02, TRNF-03, TRNF-04, TRNF-05, TRNF-06

**Success Criteria**:
1. Transfer mode can start only from a saved squad when rules allow it.
2. Pending transfers are represented as explicit swap objects, not hidden list-order diffs.
3. The review UI shows outgoing player, incoming player, budget delta, remaining transfers, and validation errors.
4. Confirm submits each swap through `POST /api/transfer` and reloads backend squad state afterward.
5. Cancel restores the saved baseline.
6. Transfer history is visible for the active matchday.

### Phase 5: Fixtures and Scores
**Goal:** Complete the user-facing tournament context and scoring views.
**Mode:** mvp
**UI hint:** yes
**Requirements:** FIXT-01, FIXT-02, FIXT-03, SCOR-01, SCOR-02, SCOR-03, SCOR-04, MATCH-03

**Success Criteria**:
1. Fixtures render from `GET /api/matches`, grouped by matchday and date.
2. Fixture navigation does not unexpectedly mutate the global active matchday.
3. Score views render cumulative score and active-round breakdown from `GET /api/score`.
4. Empty score states are explicit and do not look like broken loading.
5. The scoring guide mirrors `app/core/scoring.py`.

### Phase 6: Verification and Release Hardening
**Goal:** Prove the redesigned frontend works across key workflows and viewports.
**Mode:** mvp
**UI hint:** yes
**Requirements:** VERF-01, VERF-02, VERF-03

**Success Criteria**:
1. The frontend runs locally through the agreed serving path.
2. Manual verification covers boot, matchday switch, squad save, transfer confirm, fixture browsing, score empty state, and backend failure.
3. Lightweight automated checks or documented manual checks cover frontend rule helpers.
4. Desktop and mobile screenshots verify primary workflows and no overlapping UI.
5. Remaining known risks are documented before release.

## Coverage

- v1 requirements mapped: 37/37
- UI phases: 6/6
- Backend contract changes required: none planned

---
*Roadmap created: 2026-06-18*
