# Design System - World Cup Fantasy 2026

Status: Phase 1 correction contract. Runtime source of truth is `frontend/css/tokens.css`.

## Direction

Editorial luxury SaaS for a single-user World Cup fantasy desk. The UI should feel premium, calm, dense, and operational: closer to Stripe/Linear precision and FotMob sports-data clarity than a loud gamified fantasy app.

## Color

Use restrained semantic tokens:

- App base: near-black charcoal/slate.
- Surfaces: solid dark panels for dense data.
- Elevated surfaces: minimal glass at roughly 70% opacity and 8px blur.
- Accent: emerald for current selection and primary action.
- Secondary accent: deep blue/cyan for focus and charts.
- Warning/error/success: gold, red, emerald.

Rules:

- Do not use white text on bright accent fills unless contrast is verified.
- Do not use decorative glass on tables or dense player rows.
- Do not use raw hex in component CSS when a token exists.
- Do not bring back the saturated turf/grass background as the app identity.

## Typography

Use `Hanken Grotesk` for product UI, display text, and tabular surfaces. Runtime font tokens live in `frontend/css/tokens.css`.

- Headings are smaller and quieter than the previous display system.
- Use weight, spacing, and placement for hierarchy.
- Avoid display-font labels, buttons, and table data.
- Avoid fluid product UI typography except where a component truly needs it.

## Layout

- Persistent left sidebar on desktop.
- Workspace header contains matchday context and the Update Data action.
- Squad default layout: top summary row, tournament flow row, compact pitch plus player pool.
- Fixtures uses tabs for Standings/Snapshot and Knockout.
- Dashboard replaces Scores and presents analytics metrics from real backend state.

## Components

- Buttons: same pill vocabulary across primary, ghost, disabled, loading.
- Player rows: compact, dense, flag/avatar/name/price/add action.
- Add buttons: subtle icon-only controls, not bright blocks by default.
- Toasts and rule alerts: full border or inset emphasis, never side-stripe borders.
- Tables: dense, high-contrast, no decorative cards inside rows.
- Empty states: short, specific, and action-oriented.

## Motion

- 140-320ms transitions.
- Motion communicates state changes only.
- No content hidden while waiting for animation.
- `prefers-reduced-motion: reduce` disables animation and transitions.

## Bans

- Gradient text.
- Side-stripe borders.
- Repeating stripe backgrounds.
- 32px+ radii on ordinary cards or panels.
- Decorative glassmorphism as the default surface.
- Fake rank, fake transfer impact, or fake participation data.
