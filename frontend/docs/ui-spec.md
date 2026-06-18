# UI Spec — Phase 1: App Shell (Layout · Navigation · Pitch · Sidebar)

**Status:** Locked screen/component contract for **Phase 1** of `UI-contract.md` build order.
**Consumes:** [`design-system.md`](./design-system.md) (all tokens). **Architecture:** [`UI-contract.md`](../../docs/frontend/UI-contract.md).

Phase 1 delivers the **static app shell** — structure, layout, and styling of every region, with empty/stub
content. **No data fetching, no formation logic, no interactivity beyond hover/focus.** Data binding lands
in Phase 4; the API shapes noted below are the contract those later phases must hit.

> **Definition of done (Phase 1):** the shell renders pixel-faithful to `navbar.png` + `clone.png` with all
> five components present in their default (and where static, empty) states. Player slots are empty; numbers
> are placeholders; CTAs are non-functional.

---

## 1. Layout

Desktop-first. Single full-bleed dark shell on `--bg-app` (cobalt blue), max content width **1280px**, centered, page gutter `--sp-6`.

```
┌───────────────────────────────────────────────────────────────┐
│ NavigationBar        (logo · nav · user · stat cards)           │  region: <header>
├───────────────────────────────────────────────────────────────┤
│ MatchdayNavigation   (Round 1 … Final, horizontal strip)        │  region: <nav aria-label="Matchday">
├──────────────────────────────────────────┬────────────────────┤
│                                           │                    │
│  Pitch                                    │  Sidebar /         │  region: <main>
│  (formation slots, empty PlayerSlots)     │  SummaryPanel      │
│                                           │                    │
└──────────────────────────────────────────┴────────────────────┘
                       Toast region (fixed, bottom-center)           region: aria-live
```

### 1.1 Grid

- **Main row:** CSS grid `grid-template-columns: minmax(0,1fr) 340px;` gap `--sp-4`. Pitch left, Sidebar right.
- **Vertical rhythm:** regions stacked with `--sp-4` gap. Each region is a `--surface` panel (`--r-lg`, `--shadow-2`) except the matchday strip which may sit on its own panel.

### 1.2 Breakpoints

| Breakpoint     | Behavior |
|----------------|----------|
| ≥1200px        | Full layout as above (target / mockup width). |
| 768–1199px     | Sidebar drops **below** the pitch (single column); stat cards wrap. |
| <768px         | Nav collapses to logo + menu button; matchday strip becomes horizontally scrollable; pitch scales to width. |

> Phase 1 must at minimum implement the ≥1200px layout faithfully and not break (no overflow) below it. Full mobile polish may defer, but structure must be responsive-ready (no fixed pixel widths on the shell).

---

## 2. Components

Each: **structure → states → tokens → data (future binding)**.

### 2.1 NavigationBar  — ref `navbar.png`

**Structure.** Left: `26` emblem logo (`moodboard/logo.png`) + primary nav links **My Team · Fixtures · Scores**.
Right: user identity (`markiengo` + circular avatar) and a row of three **stat cards** — **Budget** (`$0.2m`),
**Selected** (`11/11`), **Free transfers** (`UNL`). Cards are **white** with dark text (the one bright element on the dark shell).

**States.**
- Nav link: default `--text-muted` · hover `--text` · **active** `--text` with `--accent` underline (2px).
- Logo: link to home; focus ring.
- Stat card: static in Phase 1 (placeholder values). Number = `--fs-stat` display; micro-label = `--fs-label` UPPER.

**Tokens.** Bar bg `--surface`; links `--font-display` `--fs-nav` UPPER; cards `--c-white` / `--text-on-card`, `--r-md`; active underline `--accent`.

**Data (future).** Budget ← `Squad.budget_remaining` (derived `70 − budget_used`). Selected ← count of `Squad.players` (`/11`). Free transfers ← `Transfer.transfers_remaining` (`5 − transfers_used`) for the active matchday. Username static (`markiengo`, single-user model).

---

### 2.2 MatchdayNavigation — ref `navbar.png` (round strip), `fixtures.png` (chevrons)

**Structure.** Horizontal strip of round tabs: **Round 1 · Round 2 · Round 3 · Round of 32 · Round of 16 · Quarter-final · Semi-final · Final**, each with a **date** sublabel. Optional prev/next **chevrons** (circular, `fixtures.png`). One tab is **active**.

**States.**
- **Active** round: label `--text` display, **`--accent` underline**, sublabel "Transfers open" in `--accent`.
- **Completed** round: shows a green **pts pill** (`0 pts`) under the label (`--positive` fill, `--accent-ink` text).
- **Upcoming** round: `--text-muted` label + date.
- Hover: `--text`. Focus ring on each tab + chevron.

**Tokens.** Labels `--font-display` `--fs-nav` UPPER; dates `--fs-sm` body `--text-muted`; underline `--accent`; pts pill per primitive (§7 design-system).

**Data (future).** Rounds map to **`matchday`** + **`stage`** from `GET /api/matches`. Stage → display label:
`group_stage`→"Group Stage / Round N", `round_of_32`→"Round of 32", `round_of_16`→"Round of 16",
`quarter_final`→"Quarter-final", `semi_final`→"Semi-final", `final`→"Final". Dates ← `Match.date` (earliest in matchday).
pts ← `GET /api/score?matchday=N` (sum of `breakdown[].score`). "Transfers open" vs locked ← GR-07 (locks when first match of matchday starts).

---

### 2.3 Pitch — ref `clone.png`, `squad-ref.png`

**Structure.** A football-pitch surface (dark green with subtle markings/center circle) holding **formation slots**.
Supports the **two valid formations** only — **4-3-3** (1 GK · 4 DEF · 3 MID · 3 FWD) and **4-4-2** (1 GK · 4 DEF · 4 MID · 2 FWD), per `app/core/validation.py`. Rows stack GK (back) → FWD (front). Phase 1 renders the **4-3-3** default with all slots **empty**.

**States (Pitch).** Single static state in Phase 1 (chosen formation = 4-3-3). Formation switching is wired in Phase 3.

**Tokens.** Pitch surface `--surface-pitch` (over `--surface`) with `--surface-line` markings; slots arranged on a flex/grid per row.

#### PlayerSlot (sub-component)

**States.**
- **Empty:** dashed `--surface-line` outline, `--r-md`, a `+` glyph + position label (GK/DEF/MID/FWD) in `--text-muted`. This is the Phase 1 default for all 11 slots.
- **Filled:** player card — jersey/avatar placeholder, **name** (`--font-display`, small), **team flag** badge (§6 design-system), **price** (`$X.Xm`, `--fs-sm`). Position-accent strip per §1.3 (GK gold / DEF cyan / MID green / FWD red).
- **Hover (filled):** lift (`translateY(-1px)`, `--shadow-2`). **Focus** ring.

**Data (future).** Filled slot binds to a `Player`: `name`, `position`, `team_name`, `base_price` (from `GET /api/players` / `Squad.players`). Slot↔player assignment is Phase 3.

---

### 2.4 Sidebar / SummaryPanel — ref `clone.png` (right "How to score" panel)

**Structure.** Right-hand `--surface` panel, three stacked blocks:
1. **FormationSelector** — segmented control: `4-3-3` | `4-4-2` (static, 4-3-3 preselected in Phase 1).
2. **Squad summary** — rows: *Players* `0/11`, *Budget used* `$0.0m`, *Budget remaining* `$70.0m` (placeholders).
3. **Primary CTA** — **MAKE TRANSFERS** lime pill button (`--accent` / `--accent-ink`, `--r-pill`, display UPPER), full-width. Non-functional in Phase 1.

**States.**
- Segmented control: selected segment `--accent` underline/fill-ghost; others `--text-muted`. (Interactivity Phase 3.)
- CTA: default / hover (slight lift) / focus ring / disabled (reduced opacity) — disabled by default in Phase 1.
- Summary rows static.

**Tokens.** Panel `--surface` `--r-lg`; labels `--fs-label` UPPER `--text-muted`; values `--fs-h2` display; CTA primitive (§7 design-system).

**Data (future).** Players `count/11` ← `Squad.players`. Budget used/remaining ← `Squad.budget_used` / `Squad.budget_remaining`. Formation drives slot layout (Phase 3). CTA routes to transfer flow (Phase 5).

---

### 2.5 Toast — ref `UI-contract.md` §10

**Structure.** Fixed bottom-center stack region, `aria-live="polite"`. Phase 1 ships the **container + one static demo toast** (then hidden), to lock styling.

**States.** `error` (`--danger` left border), `success` (`--positive`), `info` (`--surface-2`). Auto-dismiss timing defined here (~4s) but firing is Phase 4+.

**Tokens.** Glass surface (§4 design-system) `--glass-fill` + `--glass-blur`, `--r-md`, `--shadow-3`, body text `--fs-sm`.

**Data (future).** Maps HTTP errors: **400** → validation toast (uses API `detail` string), **404** → "Resource not found", **500** → generic. (`UI-contract.md` §10.)

---

## 3. Cross-cutting

### 3.1 Copywriting / microcopy
Terse and sporty. **UPPERCASE** for nav, round names, stat micro-labels, buttons (`BUDGET`, `MAKE TRANSFERS`,
`FINAL`). Sentence case for helper text and toasts. Numbers always with unit: `$0.2m`, `11/11`, `0 pts`.

### 3.2 Accessibility
- Landmarks: `<header>`, `<nav aria-label="Primary">`, `<nav aria-label="Matchday">`, `<main>`, toast `aria-live`.
- Every interactive element has a visible **focus ring** (`--focus-ring`, 2px, 2px offset).
- Color is never the only signal: active round = underline **+** weight, not color alone; pts pill has text.
- Contrast per `design-system.md` §1.4 (white-on-blue ≥4.5:1; never white-on-lime).
- Empty PlayerSlots have `aria-label="Empty {position} slot"`.

### 3.3 Asset notes
- Logo: `docs/frontend/moodboard/logo.png` → move/optimize into `frontend/assets/` during build.
- Fonts: load **Anton** + **Noto Sans** via `@font-face` or Google Fonts. **Never** load or reference Inter.
- Team flags: emoji or a small flag sprite/SVG set keyed by `team_id` (e.g. `ARG`, `BRA`) — sourcing decided in Phase 2.

---

## 4. Open issues (flag before later phases)

- **Backend endpoint naming (resolve before Phase 4 wiring):** `UI-contract.md` §8 lists `GET /fixtures` and
  `GET /scores`, but the **live API is `GET /api/matches` and `GET /api/score`** (singular, `/api` prefix).
  This spec binds to the **live** names. Confirm with backend and reconcile `UI-contract.md`.
- **"Selected 15/15" in `navbar.png`** is from a generic fantasy mock; **this game's squad is 11** (GR-02).
  The stat card reads **`11/11`**, not 15.
- **Captain/multiplier** appears in some references (`clone.png`) but is **V2** (`UI-contract.md` §12) — **out of scope**, no UI in Phase 1.

---

## 5. Phase 1 component checklist

- [ ] NavigationBar — logo, nav links (active/hover), user identity, 3 white stat cards.
- [ ] MatchdayNavigation — round strip (active/completed/upcoming), dates, chevrons, pts pill.
- [ ] Pitch — 4-3-3 layout, dark-green surface with markings.
- [ ] PlayerSlot — empty (default ×11) + filled state styled.
- [ ] Sidebar/SummaryPanel — formation selector, summary rows, MAKE TRANSFERS CTA.
- [ ] Toast — container + three variant styles (glass).
- [ ] Responsive ≥1200px faithful; no overflow below.
- [ ] All styling via `design-system.md` tokens; zero `Inter`.
