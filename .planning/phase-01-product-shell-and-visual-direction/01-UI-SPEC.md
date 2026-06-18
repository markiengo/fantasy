---
phase: 1
slug: product-shell-and-visual-direction
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-18
---

# Phase 1 - UI Design Contract

Visual and interaction contract for Phase 1: Product Shell and Visual Direction.

This phase rebuilds the visible frontend foundation for the World Cup Fantasy 2026 app. It must deliver the actual app shell as the first screen: navigation, matchday context, My Team layout, squad pitch, player/action panel placeholders, and global feedback surfaces. It must not become a landing page or a decorative mock disconnected from the game.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | inline sprite or local minimal SVG icons only; no runtime icon package |
| Font | display: Archivo Condensed or Anton fallback; body: Noto Sans or system sans fallback |

### Direction

The interface should feel like a serious tournament command surface: high-contrast, sporty, data-aware, and fast to scan. The design should be more operational than promotional. The user should understand the current round, squad status, transfer status, and next legal action without reading instructions.

Use the current frontend only as source behavior and API evidence. Do not preserve existing layout decisions just because they exist.

### Required Screens In Phase 1

Phase 1 locks the shell and default states for:

- My Team app shell
- Global navigation
- Matchday strip
- Squad pitch placeholder
- Right-side action/context panel
- Toast/status region
- Loading skeleton pattern
- Empty state pattern
- Error state pattern
- Mobile navigation and stacked layout

Fixtures, Scores, and Transfer internals can remain placeholders in Phase 1, but their navigation entries and empty shell states must be present.

## Spacing Scale

Declared values must stay in `frontend/css/tokens.css` or its replacement token file.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, hairline offsets |
| sm | 8px | Compact control gaps, table row inner gaps |
| md | 16px | Default component gaps |
| lg | 24px | Panel padding, nav rhythm |
| xl | 32px | Main grid gaps, screen gutters on tablet |
| 2xl | 48px | Desktop screen gutters, major row breaks |
| 3xl | 64px | Rare hero-scale spacing inside app shell only |

Exceptions: 1px borders, 2px focus outlines, 3px active indicators, and pitch line markings.

### Layout Rules

- Maximum content width: 1440px.
- Desktop shell: top navigation, matchday strip, then a two-column main grid.
- Desktop main grid: `minmax(0, 1fr)` for the primary workspace and `360px` for the action panel.
- Tablet: action panel stacks below the pitch; stat summaries wrap into two columns.
- Mobile: navigation collapses, matchday strip scrolls horizontally, pitch and action panel stack in one column.
- Fixed-format UI such as pitch slots, stat cards, round tabs, and icon buttons must have stable dimensions so hover, loading, or state text does not shift layout.
- Cards are for repeated entities or framed tools only. Do not place page sections inside floating cards.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 15px | 400 | 1.5 |
| Small | 13px | 400 | 1.4 |
| Label | 11px | 700 | 1.1 |
| Nav | 14px | 700 | 1.1 |
| Panel heading | 22px | 700 | 1.15 |
| Stat value | 28px | 700 | 1.0 |
| Display | 40px | 800 | 1.0 |

### Typography Rules

- Use tabular numbers for budget, selected count, transfer count, score, and matchday statistics.
- Letter spacing must be 0 for normal text. Labels may use positive tracking up to `0.08em`.
- Do not use viewport-scaled font sizes.
- Do not use oversized hero text inside compact panels or controls.
- Button text must fit at mobile widths without clipping.
- Use sentence case for helper text and errors. Use uppercase only for short labels, nav items, stat labels, and compact sports tags.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #0B1020 | App background and deep page base |
| Secondary (30%) | #111827 | Panels, nav, action rail, repeated surfaces |
| Surface raised | #182033 | Player rows, stat strips, active control surfaces |
| Hairline | #2A3448 | Dividers, pitch slot outlines, inactive borders |
| Text | #F8FAFC | Primary text on dark surfaces |
| Muted text | #94A3B8 | Secondary labels and metadata |
| Accent (10%) | #B6F200 | Primary action, active matchday indicator, selected slot highlight |
| Accent ink | #071014 | Text/icons on accent |
| Positive | #19C37D | Success states and point gains |
| Warning | #F5B942 | Budget pressure and transfer caution |
| Destructive | #F04438 | Remove actions and validation failure |
| Pitch | #0D3B2A | Squad pitch base |

Accent reserved for:

- Primary action button
- Active matchday underline
- Selected pitch slot
- Save-ready state
- Focus companion details only when not replacing the focus ring

Accent must not be used for every link, every badge, or every hover state.

### Palette Rules

- Avoid a one-note blue/purple gradient look. The base may be dark navy, but supporting surfaces need green pitch, lime action, white text, and restrained semantic colors.
- Do not use white text on lime. Use `Accent ink`.
- Use texture sparingly: a subtle fixed noise layer or pitch grass texture is acceptable; decorative orbs and bokeh are not.
- Keep visual contrast high enough for repeated data scanning.

## Component Contracts

### App Shell

Structure:

- Skip link
- Header with product mark, primary nav, live/demo status, and compact stats
- Matchday strip
- Main region with primary workspace and action/context panel
- Toast region with `aria-live="polite"`

States:

- Loading: skeletons for stat cards, pitch slots, player rows, and action panel.
- Empty: visible next action, not blank.
- Error: problem and retry path.
- Demo mode: persistent status, not only a toast.
- Backend connected: compact status, not distracting.

### Navigation

Primary items:

- My Team
- Fixtures
- Scores

Rules:

- Active route is indicated by weight, underline, and `aria-current`.
- Navigation controls are buttons or links with real targets/actions.
- Mobile nav must be reachable by keyboard and close on route selection.

### Matchday Strip

Content:

- Round label
- Date or date range when available
- Transfer open/locked status
- Points chip when real score data exists

Rules:

- Horizontal scroll on mobile.
- Active round must remain visible after selection.
- Completed point chips must not render fake `0 pts` unless backend data actually says 0.
- Lock/open copy must follow the backend-compatible rule decided in Phase 2.

### My Team Workspace

Default Phase 1 state:

- Pitch with 11 stable empty slots.
- Formation indicator showing 4-3-3 as the default visual placeholder.
- Player pool area can be a designed placeholder in Phase 1.
- Saved/draft distinction must have reserved UI space even before behavior is wired.

Pitch rules:

- Use a real pitch-like surface with restrained markings.
- Slots must be grouped by line: GK, DEF, MID, FWD.
- Empty slots need position labels and accessible names.
- Filled-card visual style must be specified even if not data-bound yet.

### Action Panel

Content:

- Squad mode: Build, View, or Transfer placeholder status.
- Formation control placeholder.
- Budget summary.
- Selected count.
- Transfer count.
- Primary action button.
- Secondary action area.

Rules:

- Primary action copy changes by mode: `Save squad`, `Make transfers`, `Confirm transfers`.
- Disabled actions explain why in adjacent helper text.
- Do not use `window.alert()` for validation or errors.

### Toast and Inline Feedback

Toast variants:

- Info
- Success
- Warning
- Error

Rules:

- Toasts are temporary; persistent state like demo mode belongs in the shell.
- Error messages must include the backend `detail` string when available.
- Validation issues near controls should be inline, with toast only for workflow-level failure.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA in build mode | Save squad |
| Primary CTA in saved mode | Make transfers |
| Primary CTA in transfer mode | Confirm transfers |
| Empty squad heading | Build your matchday squad |
| Empty squad body | Pick 11 players within the budget and formation rules. |
| No saved squad | No saved squad for this matchday. |
| Demo mode label | Demo data |
| Connected mode label | Live backend |
| Generic error | Could not load this data. Retry the request. |
| Validation error | Use the backend message directly when available. |
| Destructive confirmation | Remove player: this frees the slot and updates your draft. |

Copy rules:

- Avoid hype language.
- Avoid "Oops".
- Avoid claiming demo data was imported unless an import actually happened.
- Use `matchday`, `squad`, `transfer`, `budget`, and `points` consistently.

## Accessibility Contract

- Include `<main id="main">` and a skip link.
- Every icon-only button has an accessible label.
- Every interactive element has a visible focus outline.
- Focus outline: 2px solid #38BDF8 with 2px offset.
- Color is never the only signal for active, error, success, or disabled states.
- Toast region uses `aria-live="polite"`; blocking errors can use `role="alert"`.
- Reduced motion disables transform-heavy transitions while preserving state changes.
- Mobile nav is keyboard operable and does not trap focus when closed.

## Motion Contract

| Motion | Duration | Easing | Notes |
|--------|----------|--------|-------|
| Button hover | 120ms | ease-out | Transform or color only |
| Active underline | 180ms | ease-out | No layout shift |
| Panel enter | 220ms | ease-out | Opacity plus small translate |
| Toast enter | 180ms | ease-out | Respect reduced motion |
| Skeleton shimmer | 1200ms | linear | Disable under reduced motion |

Animation rules:

- Animate `transform` and `opacity`, not layout properties.
- Hover states must not resize controls.
- No decorative infinite motion outside skeleton loading.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registry | none | blocked unless explicitly approved |

No package or CDN dependency should be added in Phase 1 without checking repo constraints first. Fonts may use existing Google Fonts style only if the dependency is explicit and graceful fallback is defined.

## Implementation Boundaries For Phase 1

Phase 1 may:

- Replace the app shell HTML structure.
- Replace or reorganize CSS tokens and shell styles.
- Add static placeholder components for the primary screens.
- Add non-destructive UI state helpers for route and active-nav display.

Phase 1 must not:

- Break existing backend API paths.
- Implement final squad save, transfer confirmation, or score fetching behavior.
- Introduce a framework, bundler, or package manager requirement.
- Hide stale behavior behind mock-only data.
- Remove current files without first preserving any behavior still needed in later phases.

## Verification Contract

Manual browser checks required before Phase 1 is complete:

- Desktop width around 1440px: shell, nav, matchday strip, pitch, and action panel fit without overlap.
- Tablet width around 900px: action panel stacks cleanly.
- Mobile width around 390px: nav works, matchday strip scrolls, controls fit.
- Keyboard-only: skip link, nav, matchday tabs, primary action, and placeholder controls are reachable.
- Reduced motion: no transform-heavy animation remains.
- Text scan: no stale 15-player copy, no `/fixtures` or `/scores` user-facing contract copy, no "Oops".

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-18
