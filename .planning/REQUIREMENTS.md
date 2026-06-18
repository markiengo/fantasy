# Requirements: World Cup Fantasy 2026 Frontend Redesign

**Defined:** 2026-06-18
**Core Value:** The user can confidently build, save, review, and transfer a valid World Cup fantasy squad without losing track of matchday state, budget, rules, or backend/demo status.

## v1 Requirements

### App Shell

- [ ] **SHELL-01**: User can navigate between My Team, Fixtures, and Scores without a page reload.
- [ ] **SHELL-02**: User can see the active matchday, budget, selected count, transfers remaining, and backend/demo status from the primary app shell.
- [ ] **SHELL-03**: User can use the app on desktop and mobile widths without broken layout, overlapping text, or inaccessible controls.
- [ ] **SHELL-04**: Keyboard users can reach all interactive controls with visible focus states.

### Design System

- [ ] **DSGN-01**: The frontend uses a coherent tokenized visual system for colors, typography, spacing, radius, elevation, and motion.
- [ ] **DSGN-02**: The redesigned UI avoids stale contract assumptions such as 15-player squads, `/fixtures`, and `/scores`.
- [ ] **DSGN-03**: Loading, empty, error, disabled, hover, active, and success states are designed for every primary workflow.
- [ ] **DSGN-04**: UI copy is direct, game-specific, and avoids placeholder or misleading messages.

### Squad Builder

- [ ] **SQUAD-01**: User can browse, search, filter, and sort players by name, position, team, and price.
- [ ] **SQUAD-02**: User can add and remove players while seeing immediate validation feedback for duplicate players, squad size, formation slots, team limit, and budget.
- [ ] **SQUAD-03**: User can intentionally choose a valid formation, either 4-3-3 or 4-4-2.
- [ ] **SQUAD-04**: User can save a complete valid 11-player squad through `POST /api/squad`.
- [ ] **SQUAD-05**: User can recover an unsaved squad draft for the active matchday after refresh.
- [ ] **SQUAD-06**: User can distinguish a saved squad from an editable local draft.

### Matchdays

- [ ] **MATCH-01**: User can switch matchdays and see the correct squad, draft, transfer state, fixtures, and scores for that matchday.
- [ ] **MATCH-02**: User can tell whether transfers are open or locked for the active matchday using backend-compatible timing rules.
- [ ] **MATCH-03**: User can see completed-round point summaries only when score data exists.

### Transfers

- [ ] **TRNF-01**: User can enter transfer mode from a saved squad when transfers remain and the window is open.
- [ ] **TRNF-02**: User can create explicit one-for-one player swaps instead of relying on hidden list-order diff pairing.
- [ ] **TRNF-03**: User can review pending swaps, budget impact, remaining transfers, and rule violations before confirming.
- [ ] **TRNF-04**: User can confirm transfers through `POST /api/transfer` and then reload authoritative squad state from the backend.
- [ ] **TRNF-05**: User can cancel pending transfer edits and return to the saved baseline.
- [ ] **TRNF-06**: User can see transfer history for the active matchday.

### Fixtures

- [ ] **FIXT-01**: User can browse fixtures grouped by matchday and date using `GET /api/matches`.
- [ ] **FIXT-02**: User can see team names, flags or stable team identifiers, stage labels, kickoff/date, and scoreline when available.
- [ ] **FIXT-03**: User can move between fixture rounds without losing the global app matchday context unexpectedly.

### Scores

- [ ] **SCOR-01**: User can see cumulative score across matchdays using `GET /api/score`.
- [ ] **SCOR-02**: User can see active-matchday score breakdown by player using `GET /api/score?matchday=N`.
- [ ] **SCOR-03**: User can see helpful empty states when no score data or no saved squad exists.
- [ ] **SCOR-04**: User can open a scoring guide that mirrors `app/core/scoring.py`.

### API and State

- [ ] **API-01**: Frontend API access is centralized in one client module that uses the `/api` prefix consistently.
- [ ] **API-02**: Backend `400`, `404`, and `500` responses are handled differently and shown with actionable UI states.
- [ ] **API-03**: Network failure and demo/mock mode are explicit to the user and cannot be mistaken for live backend state.
- [ ] **API-04**: Frontend state separates persisted draft data, saved squad baseline, active matchday, transfer edits, cached players, cached teams, fixtures, and scores.

### Verification

- [ ] **VERF-01**: Redesign work can be verified locally through the FastAPI static mount or a simple static server.
- [ ] **VERF-02**: Core frontend rule helpers have lightweight automated tests or documented manual checks before final release.
- [ ] **VERF-03**: Final visual verification includes desktop and mobile browser screenshots for the primary workflows.

## v2 Requirements

### Future Game Features

- **FUTR-01**: User can choose captain and vice-captain multipliers.
- **FUTR-02**: User can view leaderboards or multiplayer leagues.
- **FUTR-03**: User can see live score updates during matches.
- **FUTR-04**: User can use dynamic player pricing.
- **FUTR-05**: User can authenticate with a real account.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend rewrite | The redesign is frontend-first and should consume the existing FastAPI API. |
| Frontend framework migration | Vanilla browser delivery is an explicit repo convention. |
| Multiplayer and auth UI | Current backend is single-user with no auth. |
| Captain and dynamic pricing UI | Not supported by v1 backend rules. |
| Bulk transfer endpoint | Current API performs one transfer per `POST /api/transfer`. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 1 | Pending |
| SHELL-02 | Phase 1 | Pending |
| SHELL-03 | Phase 1 | Pending |
| SHELL-04 | Phase 1 | Pending |
| DSGN-01 | Phase 1 | Pending |
| DSGN-02 | Phase 1 | Pending |
| DSGN-03 | Phase 1 | Pending |
| DSGN-04 | Phase 1 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| SQUAD-01 | Phase 3 | Pending |
| SQUAD-02 | Phase 3 | Pending |
| SQUAD-03 | Phase 3 | Pending |
| SQUAD-04 | Phase 3 | Pending |
| SQUAD-05 | Phase 3 | Pending |
| SQUAD-06 | Phase 3 | Pending |
| MATCH-01 | Phase 2 | Pending |
| MATCH-02 | Phase 2 | Pending |
| MATCH-03 | Phase 5 | Pending |
| TRNF-01 | Phase 4 | Pending |
| TRNF-02 | Phase 4 | Pending |
| TRNF-03 | Phase 4 | Pending |
| TRNF-04 | Phase 4 | Pending |
| TRNF-05 | Phase 4 | Pending |
| TRNF-06 | Phase 4 | Pending |
| FIXT-01 | Phase 5 | Pending |
| FIXT-02 | Phase 5 | Pending |
| FIXT-03 | Phase 5 | Pending |
| SCOR-01 | Phase 5 | Pending |
| SCOR-02 | Phase 5 | Pending |
| SCOR-03 | Phase 5 | Pending |
| SCOR-04 | Phase 5 | Pending |
| VERF-01 | Phase 6 | Pending |
| VERF-02 | Phase 6 | Pending |
| VERF-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-06-18*
*Last updated: 2026-06-18 after initial frontend redesign scoping*
