# Design System — World Cup Fantasy 2026

**Status:** Locked design contract (v1). Source of truth for all frontend styling.
**Companion:** [`ui-spec.md`](./ui-spec.md) (screen/component contract) · [`UI-contract.md`](../../docs/frontend/UI-contract.md) (architecture).

This document locks the visual language **before** any code is written. Builders consume these tokens —
no ad-hoc hex, font, or spacing values in component CSS.

---

## 0. Direction in one line

A **dark, cobalt-blue app shell** with **near-black rounded glass panels**, driven by the **FIFA World Cup
2026 official brand palette** (`style.png`), an **electric-lime** accent for actions, and a **heavy condensed**
display type paired with **Noto Sans** body. Sporty, bold, high-contrast — the look the user already mocked
up in `navbar.png` / `fixtures.png` / `clone.png`.

> ⚠️ **Color source of truth = `docs/frontend/moodboard/style.png`** (the COLOUR PALETTE block).
> The hex values below are **best-estimate seeds of the FIFA WC26 brand hues**. Before locking the build,
> **eyedropper-sample each swatch from `style.png`** and correct any token marked `/* verify */`.

> 🚫 **Hard rule: `Inter` must never appear in any `font-family` stack** anywhere in this project.

---

## 1. Color

### 1.1 Brand palette (`--c-*`) — sampled from `style.png`

Saturated, flat brand hues. These are the raw palette; components reference **semantic** tokens (§1.2), not these directly, except for data accents (group pills, charts).

**Sampled** from `style.png` via `tools/extract_palette.py` (4-hue × 4-tint matrix). Values marked
`/* kept */` have no swatch on the brand board and retain the documented seed (gold, the bright teal/cyan
used for group/position pills). Runtime source of truth is `frontend/css/tokens.css`.

```css
:root {
  /* Brand hues — sampled from style.png swatch matrix */
  --c-red:        #D60000; /* sampled (reds r2) */
  --c-orange:     #FF3C00; /* sampled (reds r3) */
  --c-gold:       #F4B223; /* kept — no gold swatch on board; group C / warning */
  --c-yellow:     #ECFF43; /* sampled (greens r4) */
  --c-lime:       #B1EA00; /* sampled (greens r3) — electric lime, the action accent */
  --c-green:      #00C752; /* sampled (greens r2) — positive / points */
  --c-teal:       #00A88E; /* kept — board teal (#004C3F) reserved for pitch; this is group G */
  --c-cyan:       #1FC3E0; /* kept — distinct from royal blue; DEF accent / focus */
  --c-azure:      #2095F2; /* sampled (blues r3) — chart/extra */
  --c-blue:       #2F4EFE; /* sampled (blues r2) — royal/cobalt, app background */
  --c-indigo:     #19247D; /* sampled (blues r1) */
  --c-aqua:       #62FED7; /* sampled (blues r4) — chart/extra */
  --c-purple:     #6101EB; /* sampled (purples r1) */
  --c-orchid:     #BA68C6; /* sampled (purples r3) — chart/extra */
  --c-magenta:    #E71E62; /* sampled (purples r4) */
  --c-lavender:   #B286FF; /* sampled (purples r2) — chart/extra */
  --c-salmon:     #FE9D80; /* sampled (reds r4) — chart/extra */
  --c-pink:       #F25CA2; /* kept — chart/extra */

  /* Neutral ramp */
  --c-black:      #0A0B0D;
  --c-ink-900:    #121317; /* panel base */
  --c-ink-800:    #1A1C21; /* panel raised / rows */
  --c-ink-700:    #24272E; /* borders, dividers on dark */
  --c-grey-500:   #8A8F98; /* muted text */
  --c-grey-300:   #C7CBD1;
  --c-white:      #FFFFFF;
  --c-pitch:      #0C3B26; /* dark grass green (board teal #004C3F leans teal; this reads as turf) */
}
```

### 1.2 Semantic tokens (use these in components)

Mapped onto the user's own mockups (`navbar.png`, `fixtures.png`, `clone.png`).

```css
:root {
  --bg-app:       var(--c-blue);    /* royal/cobalt page background */
  --surface:      var(--c-ink-900); /* primary rounded panels */
  --surface-2:    var(--c-ink-800); /* rows, nested cards, stat cards */
  --surface-line: var(--c-ink-700); /* hairline borders/dividers */
  --surface-pitch:#0E3B24;          /* football pitch green /* verify against clone.png */

  --accent:       var(--c-lime);    /* active round underline, primary CTA */
  --accent-ink:   var(--c-black);   /* text/icon ON lime (lime is light → dark ink) */

  --positive:     var(--c-green);   /* pts pill, success */
  --warning:      var(--c-gold);
  --danger:       var(--c-red);     /* red card, validation error */

  --text:         var(--c-white);   /* primary text on dark/blue */
  --text-muted:   var(--c-grey-500);
  --text-on-card: var(--c-black);   /* text on white stat cards (navbar.png) */

  --focus-ring:   var(--c-cyan);    /* keyboard focus outline */
}
```

### 1.3 Group / stage colors

Group-stage pills (see `fixtures.png`) map to brand hues. Lock the mapping so it's stable across screens:

| Group | Token        | Group | Token         |
|-------|--------------|-------|---------------|
| A     | `--c-green`  | E     | `--c-purple`  |
| B     | `--c-red`    | F     | `--c-orange`  |
| C     | `--c-gold`   | G     | `--c-teal`    |
| D     | `--c-blue`   | H     | `--c-magenta` |

Position accents (player cards / filters): GK `--c-gold`, DEF `--c-cyan`, MID `--c-green`, FWD `--c-red`.

### 1.4 Contrast rules (WCAG AA)

- Body text on `--bg-app` (blue) → use `--text` (white). White-on-`--c-blue` must clear **4.5:1**; if the sampled blue is too light, darken `--bg-app` (overlay `--c-black` @ ~12%).
- Lime (`--accent`) is a **light** color → **never** use white text on lime. Text/icons on lime = `--accent-ink` (near-black).
- Muted text (`--text-muted`) is for ≥14px secondary labels only; never for primary actions.

---

## 2. Typography

```css
:root {
  --font-display: "Anton", "Archivo", "Saira Condensed", "Arial Narrow", sans-serif;
  --font-body:    "Noto Sans", system-ui, "Segoe UI", Arial, sans-serif;
  /* 🚫 Inter is banned — do not add it to either stack. */
}
```

- **Display** (`--font-display`): heavy **condensed** face for headings, nav items, big numbers (budget,
  pts, scoreline, matchday). Matches the bold condensed look in `navbar.png` / `fixtures.png`. Primary
  **Anton** (single weight, ~400 that reads bold); fallbacks `Archivo` / `Saira Condensed` give weight range if needed.
- **Body** (`--font-body`): **Noto Sans** — the brand's stated supporting typeface. All paragraphs, labels,
  table cells, helper text.

### 2.1 Scale

| Token            | Size / line-height | Font        | Use |
|------------------|--------------------|-------------|-----|
| `--fs-display`   | 48 / 1.0           | display     | Page/section hero (e.g. "FIXTURES & RESULTS") |
| `--fs-h1`        | 32 / 1.05          | display     | Panel titles |
| `--fs-h2`        | 24 / 1.1           | display     | Sub-section, stat values |
| `--fs-stat`      | 28 / 1.0           | display     | `$0.2m`, `11/11`, `0 pts` numbers |
| `--fs-nav`       | 16 / 1.0 · UPPER · +0.04em | display | Nav links, round labels |
| `--fs-body`      | 15 / 1.5           | body        | Default text |
| `--fs-sm`        | 13 / 1.45          | body        | Helper, dates, captions |
| `--fs-label`     | 11 / 1.0 · UPPER · +0.08em | body | Micro-labels ("Budget", "Selected") |

- **Letter-spacing:** condensed display set tight (0 to −0.01em) at large sizes; UPPERCASE labels get
  positive tracking (+0.04 to +0.08em).
- **Uppercase usage:** nav links, round names, stat micro-labels, buttons. Body copy is sentence case.

---

## 3. Spacing, radius, elevation

### 3.1 Spacing scale (4px base)

```css
--sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px;
--sp-6:24px; --sp-8:32px; --sp-10:40px; --sp-12:48px; --sp-16:64px;
```

Panel inner padding: `--sp-5`/`--sp-6`. Gaps between panels: `--sp-4`. Page gutter: `--sp-6` (desktop).

### 3.2 Radius (panels are very rounded in the mockups)

```css
--r-sm:8px;   --r-md:16px;  --r-lg:24px;  --r-pill:999px;
```

- Panels/cards: `--r-lg` (matches the chunky rounding in `navbar.png`/`fixtures.png`).
- Stat cards / rows: `--r-md`.
- Pills, CTAs, badges (pts, group, "MAKE TRANSFERS"): `--r-pill`.

### 3.3 Elevation (panels float on the blue background)

```css
--shadow-1: 0 1px 2px rgba(0,0,0,.30);
--shadow-2: 0 6px 18px rgba(0,0,0,.35);   /* default panel */
--shadow-3: 0 16px 40px rgba(0,0,0,.45);  /* overlays/modals */
```

---

## 4. Glass / translucency

From `liquid-glass.png` / `translucentness.png`. **Reserved for transient/overlay surfaces** — matchday
dropdown, future transfer modal, toasts. Base panels stay solid (`--surface`) for legibility.

```css
--glass-fill:   rgba(18,19,23,.55);
--glass-stroke: rgba(255,255,255,.10);
--glass-blur:   16px; /* backdrop-filter: blur(var(--glass-blur)) saturate(140%) */
```

Always pair `backdrop-filter` with a `--glass-fill` fallback (browsers without backdrop-filter render the solid fill).

---

## 5. Motion

```css
--ease-out: cubic-bezier(.22,.61,.36,1);
--ease-in-out: cubic-bezier(.65,.05,.36,1);
--dur-fast:120ms; --dur-base:200ms; --dur-slow:320ms;
```

- Hover (links, cards): `--dur-fast`, opacity/translateY(−1px).
- Active-round underline slide: `--dur-base` `--ease-out`.
- Panel/overlay enter: `--dur-slow` `--ease-out` (fade + 8px rise).
- Respect `prefers-reduced-motion: reduce` → disable transforms, keep opacity.

---

## 6. Iconography & flags

- **Icons:** single-weight line icons (~1.75px stroke), inherit `currentColor`. Keep minimal — nav, chevrons, search.
- **Team flags** (`fixtures.png`): small **rounded-rect** badges, ~24×16, `--r-sm`, hairline `--surface-line`.
  Team names set in display font next to the flag. Never circular (rectangular reads as a flag).
- **Logo:** the `26` emblem (`moodboard/logo.png`) anchors the nav top-left.

---

## 7. Component primitives (shared)

| Primitive   | Tokens |
|-------------|--------|
| Panel       | `--surface`, `--r-lg`, `--shadow-2`, padding `--sp-6` |
| Stat card   | `--c-white` fill, `--text-on-card`, `--r-md`, display number `--fs-stat` (per `navbar.png`) |
| Pill (pts)  | `--positive` fill, `--accent-ink` text, `--r-pill`, `--fs-label` |
| Pill (group)| group hue fill, white text, `--r-pill` |
| CTA primary | `--accent` fill, `--accent-ink` text, `--r-pill`, display UPPER, `--shadow-2` |
| CTA ghost   | transparent, `--surface-line` border, `--text` |
| Focus state | `2px solid --focus-ring`, `2px` offset — on every interactive element |

---

## 8. Don't

- ❌ `Inter` in any font stack.
- ❌ White text on lime (`--accent`) — use `--accent-ink`.
- ❌ Raw hex in component CSS — reference tokens.
- ❌ Glass blur on base content panels (legibility) — overlays only.
- ❌ Circular team flags or gradient-filled brand swatches (palette is flat).
