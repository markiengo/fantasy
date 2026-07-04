# Frontend Design Specification

**Product:** Gaffer - WC26 Fantasy
**Status:** Canonical frontend design doc
**Last updated:** 2026-07-03
**Runtime sources:** `frontend/index.html`, `frontend/css/tokens.css`, `frontend/css/*.css`, `frontend/js/*.js`

This is the only active document in `frontend/docs`. It replaces the previous split planning notes. Runtime code wins if this document ever drifts.

**2026-07-03 change:** `--bg`, `--bg-env`, `--panel`, `--panel-flush`, `--panel-strong`, `--toast` moved from green-tinted dark to neutral charcoal with a faint cool/blue undertone. Values and rationale are in Section 4 (Base, Surfaces). No other tokens changed in this pass.

**2026-07-03 change:** the frontend now supports both `dark` and `light` themes. Theme is stored in `localStorage` under `gaffer_theme`, applied on `<html data-theme>`, and switched from the sidebar profile controls.

**2026-07-03 change:** the frontend is now bilingual (English / Vietnamese). Language is stored in `localStorage` under `gaffer_lang`, applied via `i18n.js`. Static text uses `data-i18n` attributes; dynamic text uses `t()` calls. Dates render via `toLocaleDateString()` with the `date.locale` key. Language toggle uses text labels (EN / Tiếng Việt) instead of flag emojis for cross-platform rendering.

## 1. Product Direction

Gaffer is an authenticated multi-user World Cup fantasy dashboard. The interface should feel like a premium operational sports desk: dense, calm, fast to scan, and data-forward. It should not feel like a loud betting app or a generic fantasy toy.

Design principles:

- Prioritize scan speed over decoration.
- Keep controls close to the data they affect.
- Use compact panels and rows for repeated information.
- Treat mock/demo state as visibly different from live/authenticated state.
- Never hide real auth or permission failures behind demo data.
- **Lime is a single-purpose signal, not a house color.** It marks exactly one thing at a time (the primary commit action, live status, or "you are here"). Everywhere else, structure and hierarchy come from blue, neutrals, and the existing status/position colors.

## 2. Runtime Structure

The frontend is a static vanilla HTML/CSS/JS app served by FastAPI from `frontend/`.

```text
frontend/
|-- index.html              # DOM shell and script/style wiring
|-- assets/                 # logo and brand imagery
|-- css/
|   |-- tokens.css          # design tokens and palette
|   |-- main.css            # app shell, shared primitives, topbar/sidebar
|   |-- auth.css            # login/signup/demo/auth overlay
|   |-- squad.css           # squad builder, pitch, pool, summary
|   |-- fixtures.css        # fixtures, standings, knockout bracket
|   |-- scores.css          # dashboard analytics
|   |-- stats.css           # top stats screen
|   |-- leaderboard.css     # leaderboard screen
|   `-- motion.css          # animation/tour/motion helpers
|-- js/
|   |-- auth.js             # Supabase browser auth wrapper
|   |-- api.js              # API client and mock fallback
|   |-- app.js              # boot, navigation, global shell state
|   |-- state.js            # client-side squad state and rule mirror
|   |-- squad.js            # Squad screen
|   |-- transfers.js        # Transfer mode
|   |-- fixtures.js         # Fixtures/standings/knockout
|   |-- scores.js           # Dashboard analytics
|   |-- stats.js            # Top Stats screen
|   |-- leaderboard.js      # Leaderboard screen
|   |-- charts.js           # Chart helpers
|   |-- howtoscore.js       # Scoring explanation overlay
|   |-- i18n.js              # Bilingual EN/VI translation dictionary and t() function
|   |-- onboarding.js       # Welcome overlay
|   |-- progress.js          # Loading overlay with localized quips
|   |-- tour.js             # Guided tour
|   `-- ui.js               # Reusable dropdown primitive
`-- docs/
    `-- DESIGN.md           # This file
```

## 3. App Shell

### Login Shell

Source: `frontend/index.html`, `frontend/css/auth.css`, `frontend/js/auth.js`, `frontend/js/app.js`

Structure:

- Full-screen `#loginScreen`.
- Centered `.login-screen__card.panel`.
- Brand mark, title/subtitle, email-or-username login form.
- Signup mode reveals username field.
- Google sign-in starts Supabase OAuth. If the OAuth user has no local profile, the app shows a blocking username modal before any authenticated feature data loads.
- Demo/guest mode is hidden for production; `Api.setDemoToken()` is a no-op and there is no backend bearer `demo-token` shortcut.
- `#authOverlay` handles confirmation/reset messaging.
- `#usernameModal` is a blocking onboarding modal for OAuth users without a local username.
- Username rules: 3-20 chars after trimming; ASCII letters, numbers, spaces, and underscores only. Vietnamese accents/diacritics and punctuation are invalid. Errors use `t("username.*")` so Vietnamese settings render Vietnamese copy.

Behavior:

- Username login posts to `/api/auth/login`, which resolves the local username to a Supabase email and returns a Supabase session.
- Auth state changes drive app/login shell switching. `INITIAL_SESSION` after OAuth can enter the app shell, but `/api/me` must pass before user feature data loads.
- Real auth failures should show auth UI, not mock app state.
- The submit button is the only lime element on this screen. Everything else (links, secondary buttons, focus rings) uses blue/neutral tokens.

### Authenticated App Shell

Source: `frontend/index.html`, `frontend/css/main.css`, `frontend/js/app.js`

Structure:

- `#appScreen.app`: two-column desktop grid.
- `.sidebar`: persistent left navigation and operational status, including the theme toggle in profile controls.
- `.main`: active screen container.
- `.topbar`: page title, total points, tour/help buttons.
- `.matchday-strip`: horizontal matchday selector.
- Screens:
  - `#screen-team`: Squad builder.
  - `#screen-fixtures`: Fixtures, standings, knockout.
  - `#screen-scores`: Dashboard analytics.
  - `#screen-stats`: Top Stats.
  - `#screen-leaderboard`: Leaderboard.

Desktop layout:

- Sidebar width: `--sidebar-w` = `248px`.
- Main content max width: `--content-max` = `1140px`.
- Main content padding: `30px 40px 56px`.
- Topbar height is compact, not hero-like.

Mobile/responsive expectations:

- Keep the sidebar/nav usable on narrow screens.
- Horizontal strips may scroll.
- Dense tables/lists must avoid text overlap.
- Panels should stack before content becomes cramped.

### Localization (i18n)

Source: `frontend/js/i18n.js`

The frontend supports English (`en`) and Vietnamese (`vi`).

- **Storage:** `localStorage` key `gaffer_lang`, defaults to `en`.
- **Static text:** `data-i18n="key"` attributes on HTML elements, applied by `applyI18n()` on load.
- **Dynamic text:** `t("key", ...args)` calls in JS for strings generated at runtime (toasts, chart labels, tour steps, etc.).
- **Aria-labels:** `data-i18n-aria-label="key"` and `data-i18n-title="key"` attributes for accessibility labels.
- **Pluralization/params:** `t()` supports `{0}`, `{1}`, … substitution.
- **Function-based values:** Some translation values are functions returning `t()` calls (e.g. tour step titles, dropdown labels) for live re-translation on language switch.
- **Dates:** `fmtShortDate()` in `app.js` uses `toLocaleDateString()` with the `date.locale` key (`en-US` / `vi-VN`).
- **Language toggle:** `.lang-toggle` button in topbar. Uses text labels ("EN" / "Tiếng Việt") instead of flag emojis for cross-platform rendering (Windows does not render country flag emojis).
- **Rule alerts:** `state.js` returns internal English reason strings ("Already in squad", "Over budget", etc.) as keys. `app.js` `resolveTitle`/`resolveDetail` and `squad.js` `BADGE_MAP` translate these at display time.
- **Loading quips:** `progress.js` uses function-based `t()` calls for 12 loading messages.

## 4. Palette

Source: `frontend/css/tokens.css`

Theme modes:

- Default: dark.
- Optional: light via persisted sidebar toggle.
- Light mode keeps the same information density and accent rules; it swaps the base from charcoal to editorial off-white, darkens structural blue for contrast, and keeps lime reserved for primary/live/current-user emphasis.

### Base

| Token | Value | Preview | Use |
|---|---|---|---|
| `--bg` | `#0a0b0d` | <span style="background:#0a0b0d;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | App base background. Neutral near-black with a faint cool undertone (was green-tinted). |
| `--bg-env` | radial dark navy/black gradient | <span style="background:radial-gradient(ellipse at center,#0d1218,#000);width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Environmental backdrop, not component fill. Cool undertone instead of green. |
| `--accent-ink` | `#0c100e` | <span style="background:#0c100e;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Text on bright lime accent. |

### Text

| Token | Value | Preview | Use |
|---|---|---|---|
| `--ink` | `#eef1ec` | <span style="background:#eef1ec;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Primary text. |
| `--ink-2` | `#cdd2c8` | <span style="background:#cdd2c8;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Secondary strong text. |
| `--muted` | `#9aa28f` | <span style="background:#9aa28f;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Secondary labels/body. |
| `--muted-2` | `#8b9285` | <span style="background:#8b9285;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Tertiary metadata. |
| `--faint` | `#8a917e` | <span style="background:#8a917e;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Low-emphasis hints. |
| `--faint-2` | `#7a8273` | <span style="background:#7a8273;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Lowest-emphasis text. |

### Primary Accent — now single-purpose, not a house color

**Rule of one:** at most one lime element active per screen at a time — the primary commit button, OR a live-status pill, OR the current-user marker. Never stack more than one. Lime must not appear as a background tint, secondary button, hover state, or decorative fill anywhere else.

| Token | Value | Preview | Use |
|---|---|---|---|
| `--accent` | `#c6f24a` | <span style="background:#c6f24a;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Primary commit action per screen (Save squad, Confirm transfer, auth submit), the "live/open" status pill, and the current-user marker on Leaderboard. Nothing else. |
| `--accent-2` | `#a6d92e` | <span style="background:#a6d92e;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Gradient end for that one primary button only. |
| `--accent-12` | `rgba(198,242,74,.12)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(198,242,74,.12)"></span> | Deprecated for general use. Reserve for the live-status pill fill only. Use `--blue-12` for all other soft-highlight backgrounds. |
| `--accent-18` | `rgba(198,242,74,.18)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(198,242,74,.18)"></span> | Deprecated for general use. Reserve for the live-status pill border/hover only. Use `--blue-18` elsewhere. |
| `--accent-glow` | `0 8px 22px -10px rgba(198,242,74,.7)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:0 0 8px 2px rgba(198,242,74,.7)"></span> | Reserved for the primary commit button only. |

Rule: use `--accent-ink` on solid `--accent`; do not put white text on bright lime.

### Secondary Accent — promoted to do the structural work lime used to do

| Token | Value | Preview | Use |
|---|---|---|---|
| `--blue` | `#7aa2ff` | <span style="background:#7aa2ff;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Active nav item, active matchday pill, focus rings, chart primary series, secondary/emphasis buttons, Leaderboard top zone. This is now the default "something is selected/active/important" color. |
| `--blue-12` *(new)* | `rgba(122,162,255,.12)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(122,162,255,.12)"></span> | Soft background for active/selected rows, tiles, and chips. Replaces most former `--accent-12` uses. |
| `--blue-18` *(new)* | `rgba(122,162,255,.18)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(122,162,255,.18)"></span> | Stronger active background/border, e.g. active nav item, active matchday pill. Replaces most former `--accent-18` uses. |
| `--warm` | `#ffb06c` | <span style="background:#ffb06c;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Warning state, Leaderboard europa/warm zone, budget-nearing-limit indicators. |
| `--danger` | `#ff8f8f` | <span style="background:#ff8f8f;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Error/destructive/locked state, Leaderboard drop zone. |
| `--danger-soft` | `rgba(255,143,143,.14)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,143,143,.14)"></span> | Soft danger background. |
| `--warning` | `#ffb06c` | <span style="background:#ffb06c;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Warning alias. |
| `--warning-soft` | `rgba(255,176,108,.14)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,176,108,.14)"></span> | Soft warning background. |

Net effect: blue becomes the everyday "active/selected/important" color across nav, filters, charts, and focus states. Lime gets freed up to mean one thing — "act now" or "this is live" — which actually makes it more noticeable, not less.

### Position Colors

| Token | Value | Preview | Position |
|---|---|---|---|
| `--pos-GK` | `#ff7428` | <span style="background:#ff7428;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Goalkeeper. |
| `--pos-DEF` | `#7aa2ff` | <span style="background:#7aa2ff;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Defender. |
| `--pos-MID` | `#a8eddc` | <span style="background:#a8eddc;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Midfielder. |
| `--pos-FWD` | `#ff8fb0` | <span style="background:#ff8fb0;width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Forward. |

Position colors already give the Squad Builder plenty of non-lime color variety (orange/blue/mint/pink). Lean on them harder for pitch/pool visuals instead of tinting slots or filters with accent.

### Surfaces

| Token | Value | Preview | Use |
|---|---|---|---|
| `--panel` | neutral dark gradient, cool undertone | <span style="background:linear-gradient(135deg,#14161a,#0d0e10);width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Default panel/card surface. Was green-tinted; now neutral so blue/lime accents pop instead of competing with the base. |
| `--panel-flush` | slightly flatter neutral gradient | <span style="background:linear-gradient(135deg,#121316,#0e0f11);width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Compact nested panel. |
| `--panel-strong` | stronger neutral dark gradient | <span style="background:linear-gradient(135deg,#0e0f12,#08090a);width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Modals/important panels. |
| `--toast` | neutral high-opacity gradient | <span style="background:linear-gradient(135deg,#0c0d0f,#060708);width:28px;height:14px;display:inline-block;border:1px solid #555;border-radius:2px"></span> | Toast surface. |
| `--tile` | `rgba(255,255,255,.04)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.04)"></span> | Small tile fill. |
| `--tile-2` | `rgba(255,255,255,.035)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.035)"></span> | Subtler tile fill. |
| `--inset` | `rgba(0,0,0,.25)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(0,0,0,.25)"></span> | Inner recessed areas. |

### Borders And Elevation

| Token | Value | Preview | Use |
|---|---|---|---|
| `--stroke` | `rgba(255,255,255,.085)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.085)"></span> | Default panel border. |
| `--stroke-soft` | `rgba(255,255,255,.06)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.06)"></span> | Subtle separators. |
| `--stroke-mid` | `rgba(255,255,255,.1)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.1)"></span> | Medium border. |
| `--stroke-strong` | `rgba(255,255,255,.14)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.14)"></span> | Strong border. |
| `--hairline` | `rgba(255,255,255,.085)` | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 0 0 100px rgba(255,255,255,.085)"></span> | Layout separators. |
| `--inset-hl` | inset white highlight | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)"></span> | Panel top highlight. |
| `--shadow-panel` | large soft black shadow + inset highlight | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:0 4px 12px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)"></span> | Default elevation. |
| `--shadow-toast` | toast elevation | <span style="background:#08090a;display:inline-block;width:28px;height:14px;border:1px solid #555;border-radius:2px;box-shadow:0 6px 16px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05)"></span> | Toasts. |

## 5. Typography

Source: `frontend/index.html`, `frontend/css/tokens.css`

Font family:

- Primary: `Hanken Grotesk`.
- Fallback: `Segoe UI`, system UI, sans-serif.
- Mono token currently also uses Hanken first, then `Cascadia Mono`, `ui-monospace`, monospace.

Type scale:

| Token | Value | Use |
|---|---:|---|
| `--fs-body` | `13px` | Base UI text. |
| `--fs-xs` | `11px` | Small metadata. |
| `--fs-sm` | `12px` | Compact body/labels. |
| `--fs-label` | `10px` | Uppercase labels. |
| `--fs-h1` | `22px` | Page title. |
| `--fs-h2` | `14px` | Panel headings/small section titles. |

Rules:

- Do not introduce oversized marketing hero typography inside the app.
- Use weight, color, and position for hierarchy before increasing size.
- Labels use uppercase, high weight, and wide but controlled letter spacing.
- Keep chart/table text compact and tabular-feeling.

## 6. Layout Tokens

| Token | Value | Use |
|---|---:|---|
| `--sidebar-w` | `248px` | Desktop sidebar column. |
| `--content-max` | `1140px` | Main content max width. |
| `--r-xs` | `8px` | Small controls. |
| `--r-sm` | `10px` | Small pills/cards. |
| `--r-md` | `13px` | Mid controls. |
| `--r-lg` | `16px` | Panels. |
| `--r-xl` | `16px` | Large panels. |
| `--r-2xl` | `22px` | Default `.panel` radius. |
| `--r-pill` | `999px` | Pills/chips. |

Radius rule: ordinary cards and panels stay controlled; avoid large decorative radii outside deliberate pill controls.

## 7. Motion

Source: `frontend/css/tokens.css`, `frontend/css/motion.css`

Tokens:

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(.16,1,.3,1)` | General smooth transition. |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | Small press/pop effects. |
| `--ease-smooth` | `cubic-bezier(.4,0,.2,1)` | Progress/loading transitions. |
| `--dur-fast` | `140ms` | Hover/focus. |
| `--dur-base` | `240ms` | Standard state change. |
| `--dur-mid` | `320ms` | Screen/panel transitions. |
| `--dur-slow` | `480ms` | Larger enter animations. |
| `--dur-enter` | `380ms` | Entry motion. |

Rules:

- Motion should confirm state change, not decorate static content.
- Buttons may use small press/hover movement.
- Screen changes use short enter animation.
- Respect `prefers-reduced-motion` behavior in `motion.css`.

## 8. Component Specs

### Panels

Classes: `.panel`, `.surface`, `.glass-panel`, `.glass`, `.glass-subpanel`

Use:

- Default grouped UI surface.
- Background: `--panel`.
- Border: `--stroke`.
- Radius: `--r-2xl`.
- Shadow: `--shadow-panel`.
- Padding defaults to `20px`.

Rules:

- Avoid nesting decorative panels inside panels unless there is a real sub-tool or modal.
- Dense rows should use subtle tile surfaces, not full heavy cards.
- No lime tint on panel backgrounds or borders, ever.

### Buttons

Classes: `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--text`, `.btn--block`, `.icon-btn`, `.btn-update`

Primary button:

- Background: lime gradient `--accent` to `--accent-2`.
- Text: `--accent-ink`.
- Used **only** for the single main commit action per screen (Save squad, Confirm transfer, auth submit). If a screen has no such action, it has no lime button.

Secondary/emphasis button *(new tier — takes over lime's old "important but not primary" role)*:

- Background: `--blue-12` fill, `--blue-18` border.
- Text: `--blue`.
- Used for secondary actions that need more visual weight than a ghost button but aren't the primary commit (e.g. "View details", "Edit filters").

Ghost button:

- Background: translucent white.
- Border: `--hairline`.
- Used for ordinary secondary actions.

Icon button:

- Square, 36px or 42px for large variant.
- Used for help, sign out, onboarding, password visibility.

Update Data button:

- Sidebar operational control.
- Uses neutral/blue-tinted background and icon block, not accent — this is an admin/ops control, not a commit action, so it should not compete visually with the primary lime button.
- Should remain visibly admin/operations-like, not a generic CTA.

### Navigation

Classes: `.sidebar`, `.brand`, `.nav`, `.nav__item`, `.topbar`, `.matchday-strip`, `.round`

Sidebar:

- Sticky desktop column.
- Contains brand, nav links, deadline status, Update Data, profile controls.
- Active nav uses `--blue-18` background and a left `--blue` accent bar (was lime — lime is no longer used for "currently viewing" state, since that happens on every screen load and shouldn't spend the scarce accent).

Topbar:

- Contains screen eyebrow/title, total points chip, help/tour actions.
- Copy changes by screen through `SCREEN_COPY` in `app.js`.
- Total points chip uses `--blue-12`/`--blue` instead of accent, unless the matchday is currently live, in which case it may use the accent live-status pill styling.

Matchday strip:

- Horizontal scroller with prev/next buttons.
- Active round uses solid `--blue` with `--ink` text (was solid lime with dark text).
- Points chip uses `--blue-12`.
- A separate small live-status pill (accent) appears only on the matchday that is actually in progress — this is the one place lime shows up here, and it now means something specific instead of just "selected."

### Auth UI

Files: `auth.css`, `auth.js`, `app.js`

States:

- Login.
- Signup.
- Forgot password.
- Check-email/reset overlay.
- Demo mode.

Rules:

- Auth form should be calm and direct.
- Demo mode must remain visibly non-production.
- Google sign-in is implemented through Supabase OAuth and must keep the username-completion gate visible until `/api/complete-profile` succeeds.
- Only the submit button is lime; links and secondary actions use blue/neutral tokens.

### Squad Builder

Files: `squad.css`, `squad.js`, `state.js`

Primary zones:

- Top summary row.
- Tournament/matchday flow row.
- Pitch with formation slots.
- Player pool and filters.
- Summary/action panel.

Key components:

- Player token: filled/empty/captain states.
- Captain popover.
- Position filters.
- Team search chips.
- Rule badges: already selected, slot full, over budget, team limit, locked.
- Save/transfer action area.

Rules:

- Formation is only 4-3-3 or 4-4-2.
- Budget cap is 50M.
- Squad target is 11 players.
- National team limit scales by tournament stage: 3 (GS + R32), 4 (R16), 5 (QF), 6 (SF), 8 (Final). Mirrored in `state.js::nationLimitForMatchday()` and `validation.py::nation_limit_for_matchday()`.
- The UI may mirror rules, but backend validation remains authoritative.
- Filled player tokens are colored by `--pos-*` (already four distinct colors), not by accent. Selected/hover states on pool rows use `--blue-12`. Accent appears only on the Save button and, where used, the captain badge.

### Fixtures

Files: `fixtures.css`, `fixtures.js`

Views:

- Standings/Snapshot.
- Fixture list.
- Knockout bracket.

Components:

- Match card/row.
- Team flag/name block.
- Score and penalty display.
- Group standings table.
- Qualification markers.
- Knockout node and connector lines.

Rules:

- Group standings are computed from loaded matches.
- Knockout bracket should reflect live match slots and winners.
- Live match indicators use the accent live-status pill; everything else (qualification markers, winner paths) uses blue/neutral, not lime.

### Dashboard

Files: `scores.css`, `scores.js`, `charts.js`

Views/components:

- Matchday score hero.
- Matchday nav.
- Captain impact.
- Score composition.
- Rank trajectory.
- Top scorers.
- Value scatter.
- Efficiency bars.
- Donut composition.
- Transfer summary.

Rules:

- Chart primary series/lines use `--blue`, not accent. Reserve accent in charts for a single "this is you" data point or marker, if one exists, so it still reads as special.

Data sources:

- `/api/analytics/squad-score`
- `/api/analytics/composition`
- `/api/analytics/rank-history`
- `/api/transfers`
- `/api/playerstats/top`

### Top Stats

Files: `stats.css`, `stats.js`

Components:

- Top fantasy score.
- Top scorers.
- Top assists.
- Top goal involvements.
- Top clean sheets.
- Top cards.

Rules:

- Use compact stat rows.
- The lead row may receive stronger visual emphasis using `--blue-12`/`--blue` (was accent) — this screen has no single "primary action," so it gets no lime at all.
- Cards should remain dense and comparable.

### Leaderboard

Files: `leaderboard.css`, `leaderboard.js`

Modes:

- Overall.
- Matchday.

Components:

- Summary block.
- Overall/matchday toggle.
- Matchday tab strip.
- Ranking table.
- Sticky current-user row.
- Zone color coding.
- Admin crown badge (`.lb-admin-badge`) — top-right of card header, admin-only.

Zone colors currently use:

- Top: blue (`#7aa2ff`) <span style="background:#7aa2ff;width:18px;height:10px;display:inline-block;border:1px solid #555;border-radius:2px;vertical-align:middle"></span>.
- Europa/warm zone: warm (`#ffb06c`) <span style="background:#ffb06c;width:18px;height:10px;display:inline-block;border:1px solid #555;border-radius:2px;vertical-align:middle"></span>.
- Conference/forward-pink zone: `#ff8fb0` <span style="background:#ff8fb0;width:18px;height:10px;display:inline-block;border:1px solid #555;border-radius:2px;vertical-align:middle"></span>.
- Pack: muted (`#8b9285`) <span style="background:#8b9285;width:18px;height:10px;display:inline-block;border:1px solid #555;border-radius:2px;vertical-align:middle"></span>.
- Drop/danger: `#ff8f8f` <span style="background:#ff8f8f;width:18px;height:10px;display:inline-block;border:1px solid #555;border-radius:2px;vertical-align:middle"></span>.
- Current user: accent lime outline <span style="background:transparent;width:18px;height:10px;display:inline-block;border:2px solid #c6f24a;border-radius:2px;vertical-align:middle"></span>.

This screen is already the most color-diverse in the app (blue/warm/pink/muted/danger) and is a good model for the rest of the product. The current-user marker is one of the three sanctioned lime uses — keep it, since it's a single, meaningful, non-repeating highlight and doesn't collide with the zone colors.

Rules:

- Current user must be visually findable.
- Empty matchdays should be clearly disabled/empty.
- Scores should use `squad_score`; tolerate legacy `score` only as compatibility.

### Toasts, Alerts, Overlays

Files: `main.css`, `howtoscore.js`, `onboarding.js`, `tour.js`

Components:

- Toast stack: fixed bottom center.
- Rule alert: explains why a player/action is blocked.
- Welcome overlay: first-run onboarding.
- Score overlay: scoring explanation with game rules, prize pool, and nation-limit scaling table (3 → 4 → 5 → 6 → 8 by stage).
- Guided tour: target highlight and instruction card.

Rules:

- Overlay panels use strong panel surfaces.
- Toasts should be short and specific.
- Rule alerts should explain the exact constraint.
- Guided tour highlight ring uses `--blue`, not accent, so it doesn't get visually confused with a live-status or primary-action pill.

## 9. Data And API Contracts Used By Frontend

Source: `frontend/js/api.js`, `docs/API.md`

Public/catalog calls:

- `GET /api/players`
- `GET /api/teams`
- `GET /api/matches`
- `GET /api/matches/{id}`
- `GET /api/playerstats`
- `GET /api/playerstats/top`

Authenticated user calls:

- `GET /api/me`
- `POST /api/complete-profile`
- `GET /api/squad?matchday=N`
- `POST /api/squad`
- `GET /api/transfers?matchday=N`
- `POST /api/transfer`
- `GET /api/analytics/squad-score`
- `GET /api/analytics/composition?matchday=N`
- `GET /api/analytics/rank-history`
- `GET /api/leaderboard`

Admin operation:

- `POST /api/load-stats`

Fallback rule:

- API mock fallback is allowed only for public catalog/stat reads when the backend is unreachable.
- Authenticated user, leaderboard, squad, transfer, analytics, and admin calls must not fall back to mock data.
- HTTP errors from the backend must propagate, especially 401 and 403.

## 10. Accessibility Rules

- Keep the skip link.
- Keep sidebar labeled as primary navigation.
- Screens need meaningful `aria-label` values.
- Dialog overlays should keep `role="dialog"`, `aria-modal="true"`, and labeled headings.
- Icon-only controls need `aria-label`.
- Do not rely on color alone for active/current/locked/error state.
- Make focus states visible on buttons, links, inputs, and tabs.

## 11. Copy Rules

Voice:

- Short, operational, specific.
- Use football/fantasy terms only where they reduce explanation.
- Avoid marketing copy inside tool surfaces.

Examples:

- Good: `Sync completed match stats`, `No leaderboard data for this matchday yet.`, `Captain is required`.
- Avoid: long onboarding-style explanations inside panels.

Labels:

- Nav labels: Squad, Fixtures, Dashboard, Top Stats, Leaderboard.
- Status labels: DEADLINE, OPEN/LOCKED, Live backend, Demo mode.
- Action labels: Save squad, Make transfers, Update Data.

## 12. Design Bans

Do not add:

- Gradient text.
- Decorative stripe backgrounds.
- Heavy glassmorphism as a default table/list surface.
- Huge card radii on normal panels.
- Bright white text on lime accent.
- Fake rank, fake transfer impact, or fake participation data in live mode.
- Marketing hero sections inside the app.
- Decorative UI that reduces scan density.
- **Lime as a background tint, secondary button, hover state, decorative fill, or "currently viewing" indicator.** If you're reaching for lime and it's not the primary commit action, the live pill, or the current-user marker, use blue instead.
- **More than one active lime element on screen at the same time.**

## 13. When Adding A New Frontend Feature

Update this file when a feature changes:

- Navigation or screen structure.
- Design tokens or palette.
- Core component vocabulary.
- API route usage.
- Auth/demo/mock behavior.
- Accessibility contract.
- Responsive behavior.

Implementation checklist:

1. Use existing tokens before adding raw colors.
2. Add markup in `index.html` only when it is real runtime structure.
3. Put screen-specific styles in the matching CSS file.
4. Put shared primitives in `main.css` or `tokens.css` only if reused.
5. Keep backend API calls inside `api.js`.
6. Keep app orchestration in `app.js`; screen modules own their own rendering.
7. Verify text fits at mobile and desktop widths.
8. Run the relevant API route against mock and live/error states.
9. **Before shipping any new color, check: is this lime? If yes — is it the primary commit action, the live pill, or the current-user marker? If not, use blue or a neutral instead.**

