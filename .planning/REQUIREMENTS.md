# Requirements: World Cup Fantasy 2026 Frontend Redesign

**Defined:** 2026-06-18
**Core Value:** The user can confidently build, review, transfer, and score a legal World Cup fantasy squad without losing track of matchday state, budget, transfer limits, or whether the app is connected to real backend data.

## v1 Requirements

### App Shell

- [ ] **SHELL-01**: User can open the app and immediately see the primary fantasy workspace, not a landing page.
- [ ] **SHELL-02**: User can navigate between My Team, Fixtures, and Scores without a page reload.
- [ ] **SHELL-03**: User can switch matchdays and see the active matchday reflected consistently across relevant screens.
- [ ] **SHELL-04**: User can tell whether the app is using real backend data, loading data, or running in demo/mock mode.
- [ ] **SHELL-05**: User can use the app at desktop and mobile widths without incoherent overlap or horizontal overflow.

### Design System

- [ ] **DSGN-01**: User sees a cohesive World Cup fantasy visual system with clear typography, color, spacing, and component rules.
- [ ] **DSGN-02**: User sees consistent loading, empty, error, success, hover, active, disabled, and focus states across screens.
- [ ] **DSGN-03**: User sees football-specific information hierarchy for matchday, budget, transfers, formation, fixtures, and points.
- [ ] **DSGN-04**: User can operate all interactive controls with visible keyboard focus and accessible labels.

### Data And API

- [ ] **DATA-01**: User can load players, teams, matches, squads, transfers, and scores from the live `/api` backend paths.
- [ ] **DATA-02**: User sees meaningful backend validation errors instead of generic failures.
- [ ] **DATA-03**: User can recover from network failure without confusing failed real requests with saved game state.
- [ ] **DATA-04**: User can refresh the browser without losing the active matchday or an unsaved squad draft.

### Squad Builder

- [ ] **SQUAD-01**: User can view the player pool with search, position, team, price, and sort controls.
- [ ] **SQUAD-02**: User can build exactly 11 players into a legal 4-3-3 or 4-4-2 squad.
- [ ] **SQUAD-03**: User receives immediate client-side feedback for duplicate players, position limits, team limit, budget limit, and incomplete squad state.
- [ ] **SQUAD-04**: User can see selected count, budget used, budget remaining, and formation status while editing.
- [ ] **SQUAD-05**: User can save a complete legal squad through `POST /api/squad`.
- [ ] **SQUAD-06**: User can review a saved squad in read-only mode without accidentally editing it.

### Transfers

- [ ] **TRAN-01**: User can enter transfer mode from a saved squad when transfers are available.
- [ ] **TRAN-02**: User can stage one-for-one swaps while seeing transfer count, budget impact, and validation status.
- [ ] **TRAN-03**: User can cancel staged transfers and return to the saved baseline squad.
- [ ] **TRAN-04**: User can confirm staged transfers through `POST /api/transfer` calls and then reload backend state.
- [ ] **TRAN-05**: User can understand partial success, total rejection, or complete success after transfer confirmation.
- [ ] **TRAN-06**: User can see when the transfer window is locked for a matchday.

### Fixtures

- [ ] **FIXT-01**: User can browse fixtures by matchday.
- [ ] **FIXT-02**: User can see teams, dates, kickoff information when available, stages, groups, and scorelines when available.
- [ ] **FIXT-03**: User can distinguish upcoming, live/played, and completed fixture states from the UI.

### Scores

- [ ] **SCOR-01**: User can see cumulative score across matchdays.
- [ ] **SCOR-02**: User can see current matchday score breakdown by player.
- [ ] **SCOR-03**: User can see clear empty states when stats or scores are not available yet.
- [ ] **SCOR-04**: User can open a scoring guide that mirrors backend scoring rules.

## v2 Requirements

### Product Expansion

- **V2-01**: User can compare performance on a leaderboard.
- **V2-02**: User can use authentication for multiple users.
- **V2-03**: User can see live score updates.
- **V2-04**: User can use captain or vice-captain multipliers.
- **V2-05**: User can see dynamic player pricing.

### Engineering

- **V2-06**: Developer can run automated frontend tests for critical flows.
- **V2-07**: Developer can run visual regression checks for the redesign.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frontend framework migration | Current repo contract is vanilla HTML, CSS, and JavaScript |
| Backend endpoint redesign | Redesign should work with the existing FastAPI API |
| Auth screens | Single-user mode is intentional for v1 |
| Multiplayer and leaderboards | SRS defers multiplayer beyond v1 |
| Live score streaming | Backend currently stores and reads computed scores |
| Captain system | Existing docs mark it as v2 |
| Dynamic pricing | Existing game rules keep prices static |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 2 | Pending |
| SHELL-02 | Phase 3 | Pending |
| SHELL-03 | Phase 4 | Pending |
| SHELL-04 | Phase 4 | Pending |
| SHELL-05 | Phase 6 | Pending |
| DSGN-01 | Phase 1 | Pending |
| DSGN-02 | Phase 1 | Pending |
| DSGN-03 | Phase 1 | Pending |
| DSGN-04 | Phase 6 | Pending |
| DATA-01 | Phase 4 | Pending |
| DATA-02 | Phase 4 | Pending |
| DATA-03 | Phase 4 | Pending |
| DATA-04 | Phase 3 | Pending |
| SQUAD-01 | Phase 3 | Pending |
| SQUAD-02 | Phase 3 | Pending |
| SQUAD-03 | Phase 3 | Pending |
| SQUAD-04 | Phase 3 | Pending |
| SQUAD-05 | Phase 4 | Pending |
| SQUAD-06 | Phase 4 | Pending |
| TRAN-01 | Phase 5 | Pending |
| TRAN-02 | Phase 5 | Pending |
| TRAN-03 | Phase 5 | Pending |
| TRAN-04 | Phase 5 | Pending |
| TRAN-05 | Phase 5 | Pending |
| TRAN-06 | Phase 5 | Pending |
| FIXT-01 | Phase 4 | Pending |
| FIXT-02 | Phase 4 | Pending |
| FIXT-03 | Phase 4 | Pending |
| SCOR-01 | Phase 4 | Pending |
| SCOR-02 | Phase 4 | Pending |
| SCOR-03 | Phase 4 | Pending |
| SCOR-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

## Definition of Done

- The frontend runs without a build step.
- The app uses live `/api` endpoints where backend data is available.
- Manual browser verification covers desktop and mobile widths.
- Core game flows have visible loading, empty, error, and success states.
- No frontend rewrite phase regresses backend validation behavior.

---
*Requirements defined: 2026-06-18*
*Last updated: 2026-06-18 after frontend redesign project initialization*
