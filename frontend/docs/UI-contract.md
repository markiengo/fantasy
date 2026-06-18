# World Cup Fantasy 2026 — Frontend Contract

Version: 1.1

---

## 1. Architecture

**Frontend:** HTML, CSS, Vanilla JavaScript
**Backend:** FastAPI
**Communication:** REST API

---

## 2. Folder Structure

```
frontend/
├── docs/
│   ├── ui-spec.md
│   ├── design-system.md
│   └── frontend-contract.md
│
├── css/
│   ├── main.css
│   ├── squad.css
│   ├── fixtures.css
│   └── scores.css
│
├── js/
│   ├── api.js
│   ├── state.js
│   ├── squad.js
│   ├── transfers.js
│   ├── fixtures.js
│   ├── scores.js
│   └── charts.js
│
├── assets/
└── index.html
```

---

## 3. Build Order

| Phase | Scope |
|---|---|
| 1 | Layout, Navigation, Pitch, Sidebar |
| 2 | Player Pool, Search, Filters |
| 3 | Squad Builder, Formation Logic, Budget Updates |
| 4 | API Integration |
| 5 | Transfers |
| 6 | Scores & Analytics |

---

## 4. Global State

```javascript
currentMatchday
players
currentSquad
fixtures
scores
```

---

## 5. Squad Object

```javascript
currentSquad = {
    matchday: 1,
    formation: "4-3-3",
    players: []
}
```

---

## 6. Local Storage

**Persist:** Draft Squad, Selected Matchday

**Purpose:** prevent data loss on refresh.

---

## 7. Player Data Strategy

On application startup: `GET /players`, store all players in memory.

Search, filtering, and sorting are all client-side — the World Cup player dataset is small enough that this is fine for v1.

---

## 8. API Mapping

| Endpoint | Used by | Cached |
|---|---|---|
| `GET /players` | Player Pool | Yes |
| `GET /players/{player_id}` | Player detail view (Player Pool row click) | No |
| `GET /teams` | Team limit validation, team filter on Player Pool | Yes |
| `GET /matches` | Fixtures Screen | No |
| `GET /matches/{match_id}` | Fixtures Screen → match detail / score breakdown | No |
| `POST /squad` | Save Squad | — |
| `GET /fixtures` | Fixtures Screen | — |
| `GET /scores` | Scores Screen | — |
| `POST /transfer` | Transfer Confirmation | — |
| `GET /transfers` | Transfer History | — |

**Note:** `GET /fixtures` and `GET /scores` are referenced here per the original v1 contract, but API.md (v2.3) defines the live endpoints as `GET /matches` (fixtures) and `GET /score` (scoring, singular). Confirm with backend which naming is authoritative before wiring Phase 4 — this doc and API.md currently disagree on endpoint names for these two.

---

## 9. Matchday Workflow

```
User selects matchday
  → IF squad exists for that matchday: load it
  → ELSE IF a previous squad exists: load latest squad before selected matchday
  → ELSE: start Build Squad mode
```

This mirrors the Squad Inheritance Rule in `ui-spec.md` Section 4 — keep both in sync if either changes.

---

## 10. Error Handling

| Status | Response |
|---|---|
| 400 | Validation toast |
| 404 | Resource not found |
| 500 | Generic error message |

---

## 11. Components

`NavigationBar` · `MatchdayNavigation` · `Pitch` · `PlayerSlot` · `PlayerPool` · `PlayerRow` · `FormationSelector` · `SummaryPanel` · `TransferModal` · `FixturesList` · `ScoreCharts` · `ContributionTable` · `Toast`

---

## 12. Future V2

- Authentication
- Leaderboards
- Live Scores
- External Data APIs
- Player Images
- Dynamic Pricing
- Captain System