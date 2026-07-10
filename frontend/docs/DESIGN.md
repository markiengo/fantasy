# Frontend Design Specification

**Product:** Gaffer — WC26 Fantasy
**Last updated:** 2026-07-09

This is the canonical design document for the Gaffer frontend. It describes what users see, how the interface behaves, and the visual rules that keep the product consistent. Runtime code wins if this document ever drifts.

## 1. Product Direction

Gaffer is an authenticated multi-user World Cup fantasy dashboard. The interface should feel like a premium operational sports desk: dense, calm, fast to scan, and data-forward. It should not feel like a loud betting app or a generic fantasy toy.

Design principles:

- Prioritize scan speed over decoration.
- Keep controls close to the data they affect.
- Use compact panels and rows for repeated information.
- Treat demo state as visibly different from live/authenticated state.
- Never hide real auth or permission failures behind demo data.
- **Lime is a single-purpose signal, not a house color.** It marks exactly one thing at a time — the primary commit action, a live status, or "you are here." Everywhere else, structure and hierarchy come from blue, neutrals, and the existing status/position colors.

## 2. Screen Structure

The app has two main states: the login screen and the authenticated dashboard.

### Login Screen — UC-02

A full-screen centered card with the brand mark, a welcome title, and an email-or-username login form. A signup toggle reveals a display name field. Google sign-in is available as an alternative. The submit button is the only lime element on this screen — everything else uses blue and neutral tones.

After Google OAuth redirect, users without a local profile see a blocking modal asking them to choose a display name (2–30 characters) before the app loads.

### Authenticated Dashboard — UC-03 to UC-11

A two-column layout on desktop:

- **Left sidebar** (248px): brand, navigation links, deadline status, admin data controls, and profile controls (theme toggle, language toggle, sign out). The manager's avatar appears here, generated from their display name using Dicebear personas style with randomized pastel backgrounds.
- **Main area** (max 1140px): top bar with screen title and total points, a horizontal matchday strip, and the active screen content.

Six screens:

1. **Squad** — Build and manage your 11-player squad on a visual pitch. (UC-03, UC-04, UC-05, UC-06)
2. **Fixtures** — Browse match schedules, group standings, and knockout brackets. (UC-08)
3. **Dashboard** — View your squad's score breakdown, rank trajectory, league comparison, player breakdown, and transfer history. (UC-09, UC-10)
4. **Top Stats** — See the tournament's top fantasy performers by category. (UC-10)
5. **Leaderboard** — Compare your ranking against all active managers and see popular picks. (UC-11)
6. **Account** — View account info (email, username, role, user ID), update display name, choose avatar, and sign out. (UC-14)

On mobile, the sidebar remains usable, horizontal strips scroll, and panels stack before content becomes cramped.

## 3. Localization

The app supports English and Vietnamese. The user's language preference is saved and restored on return.

- All static text uses translation keys — no hardcoded English anywhere.
- Dynamic text (toasts, chart labels, tour steps) is translated at render time.
- Dates render using the user's locale format.
- The language toggle uses text labels ("EN" / "Tiếng Việt") instead of flag emojis for cross-platform rendering (Windows does not render country flag emojis).
- All user-supplied text (player names, team names, display names) is HTML-escaped to prevent XSS.
- Loading messages are localized — 12 rotating quips that cycle while data loads.

## 4. Palette

### Theme

The app defaults to dark mode. An optional light mode swaps the base from charcoal to editorial off-white (#f8f8f5), darkens structural blue for contrast, and keeps lime reserved for the same single-purpose uses.

### Base

The dark base is a neutral near-black (#0a0b0d) with a faint cool undertone — not green-tinted. The environmental backdrop uses a radial dark navy-to-black gradient. Text on bright lime uses a dark ink color (#0c100e).

### Text

| Role | Color | Hex |
|---|---|---|
| Primary text | off-white | #eef1ec |
| Secondary strong | light gray-green | #cdd2c8 |
| Secondary body | muted sage | #9aa28f |
| Tertiary metadata | dimmer sage | #8b9285 |
| Low-emphasis hints | faint sage | #8a917e |
| Lowest-emphasis | dim sage | #7a8273 |

### Primary Accent — Lime

**Rule of one:** at most one lime element active per screen at a time — the primary commit button, OR a live-status pill, OR the current-user marker on the leaderboard. Never stack more than one.

| Role | Color | Hex |
|---|---|---|
| Primary accent | bright lime green | #c6f24a |
| Gradient end | darker lime | #a6d92e |
| Soft fill (live pill only) | 12% lime | rgba(198,242,74,.12) |
| Border/hover (live pill only) | 18% lime | rgba(198,242,74,.18) |
| Glow shadow | lime glow | 0 8px 22px -10px rgba(198,242,74,.7) |

Lime must never appear as a background tint, secondary button, hover state, decorative fill, or "currently viewing" indicator. Use dark ink text on solid lime — never white.

### Secondary Accent — Blue

Blue is the everyday "active/selected/important" color across navigation, filters, charts, and focus states.

| Role | Color | Hex |
|---|---|---|
| Active/selected | soft blue | #7aa2ff |
| Soft background | 12% blue | rgba(122,162,255,.12) |
| Stronger background/border | 18% blue | rgba(122,162,255,.18) |

Additional accent colors:

| Role | Color | Hex |
|---|---|---|
| Warning / warm zone | warm orange | #ffb06c |
| Error / locked / drop zone | soft red | #ff8f8f |
| Soft danger background | 14% red | rgba(255,143,143,.14) |
| Soft warning background | 14% orange | rgba(255,176,108,.14) |

### Position Colors

| Position | Color | Hex |
|---|---|---|
| Goalkeeper | orange | #ff7428 |
| Defender | blue | #7aa2ff |
| Midfielder | mint | #a8eddc |
| Forward | pink | #ff8fb0 |

These four colors give the squad builder plenty of variety without needing lime.

### Surfaces

| Surface | Description |
|---|---|
| Default panel | Neutral dark gradient with a cool undertone (#14161a → #0d0e10) |
| Compact nested panel | Slightly flatter neutral gradient (#121316 → #0e0f11) |
| Modal / important panel | Stronger dark gradient (#0e0f12 → #08090a) |
| Toast | High-opacity neutral gradient (#0c0d0f → #060708) |
| Small tile fill | 4% white |
| Subtler tile | 3.5% white |
| Inner recess | 25% black |

### Borders

| Role | Value |
|---|---|
| Default panel border | 8.5% white |
| Subtle separator | 6% white |
| Medium border | 10% white |
| Strong border | 14% white |
| Layout separator | 8.5% white |
| Panel top highlight | inset 12% white |
| Default elevation | soft black shadow + inset top highlight |
| Toast elevation | slightly stronger shadow |

## 5. Typography

**Font:** Hanken Grotesk (weights 400–800), with Segoe UI and system UI as fallbacks.

| Size | Value | Use |
|---|---:|---|
| Body | 13px | Base UI text |
| Extra small | 11px | Small metadata |
| Small | 12px | Compact body and labels |
| Label | 10px | Uppercase labels |
| Page title | 22px | Screen headings |
| Panel heading | 14px | Section titles |

Rules:

- No oversized marketing hero typography inside the app.
- Use weight, color, and position for hierarchy before increasing size.
- Labels use uppercase, high weight, and wide but controlled letter spacing.
- Keep chart and table text compact and tabular-feeling.

## 6. Layout

| Measurement | Value | Use |
|---|---:|---|
| Sidebar width | 248px | Desktop sidebar column |
| Content max width | 1140px | Main content area |
| Small radius | 8px | Small controls |
| Small pill radius | 10px | Small pills and cards |
| Medium radius | 13px | Mid controls |
| Large radius | 16px | Panels |
| Extra-large radius | 22px | Default panel radius |
| Pill radius | 999px | Fully rounded pills and chips |

Ordinary cards and panels stay controlled — no large decorative radii outside deliberate pill controls.

## 7. Motion

| Feel | Duration | Use |
|---|---:|---|
| Fast | 140ms | Hover and focus |
| Base | 240ms | Standard state change |
| Mid | 320ms | Screen and panel transitions |
| Slow | 480ms | Larger enter animations |
| Entry | 380ms | Entry motion |

Easing: a smooth cubic-bezier for general transitions, a spring curve for small press/pop effects, and a steady ease for progress/loading.

Rules:

- Motion confirms state change — it doesn't decorate static content.
- Buttons use small press and hover movement.
- Screen changes use a short enter animation.
- Respect reduced-motion preferences.

## 8. Components

### Panels

The default grouped UI surface: a dark gradient card with a subtle border, 22px radius, and a soft shadow. Padding is 20px. Avoid nesting decorative panels inside panels. Dense rows use subtle tile surfaces instead of heavy cards. No lime tint on panel backgrounds or borders.

### Buttons

**Primary button** — lime gradient with dark text. Used only for the single main commit action per screen (Save squad, Confirm transfer, auth submit). If a screen has no commit action, it has no lime button.

**Secondary button** — soft blue fill with a blue border and blue text. For actions that need more weight than a ghost button but aren't the primary commit (e.g. "View details", "Edit filters").

**Ghost button** — translucent white with a hairline border. For ordinary secondary actions.

**Icon button** — square, 36px (or 42px for large). Used for help, sign out, onboarding, password visibility.

**Update Data button** — sidebar admin control. Uses neutral/blue-tinted styling, not lime — this is an admin operation, not a commit action.

### Navigation

The sidebar contains brand, nav links, deadline status, admin controls, and profile controls. The active nav item has a blue background and a left blue accent bar. Lime is not used for "currently viewing" — that happens on every screen load and shouldn't spend the scarce accent.

The top bar shows the current screen title, total points chip, and help/tour buttons. The points chip uses blue styling, unless the matchday is currently live, in which case it may use the lime live-status pill.

The matchday strip is a horizontal scroller with prev/next buttons. The active round is solid blue. A separate small live-status pill (lime) appears only on the matchday that is actually in progress — meaning "this matchday is live" rather than just "selected."

### Squad Builder — UC-03, UC-04, UC-06, GR-01 to GR-04, GR-07, GR-09, GR-10

Primary zones: top summary row, matchday flow row, visual pitch with formation slots, player pool with filters, and a summary/action panel.

Key components:

- Player tokens on the pitch: filled, empty, or captain states. Filled tokens are colored by position (orange/blue/mint/pink), not by accent.
- Captain popover for assigning the captain.
- Position filters and team search chips.
- Rule badges: already selected, slot full, over budget, team limit, locked.
- Save/transfer action area.

Rules:

- Formation is 4-3-3 or 4-4-2 (GR-03).
- Budget cap is $50M (GR-01).
- Squad target is 11 players (GR-02).
- National team limit scales by tournament stage: 3 (Group Stage + R32), 4 (R16), 5 (QF), 6 (SF), 8 (Final) (GR-04).
- The UI mirrors rules, but backend validation is authoritative.
- Selected/hover states on pool rows use soft blue. Lime appears only on the Save button and the captain badge.

**Draft persistence:** Unsaved squad drafts are saved to the browser's local storage, so accidental page refreshes don't lose in-progress squad building. The draft is only cleared on a fresh login, not on a page reload. The before-refresh warning is shown for unsaved transfers and typed search input, but not for build-mode drafts since they persist automatically.

### Fixtures — UC-08

Three views: standings/snapshot, fixture list, and knockout bracket.

Components include match cards with team flags and scores, group standings tables, qualification markers, and knockout bracket nodes with connector lines. Live match indicators use the lime live-status pill; everything else uses blue and neutral tones.

### Dashboard — UC-09, UC-10, GR-08, GR-09

Components: total points hero with budget gauge and score trajectory area chart, score composition (adds/deductions split), captain impact, rank trajectory, you vs league average comparison, player breakdown (per-stat point breakdown with raw stats), value for money scatter, position contribution donut, matchday insights (MVP/flop/transfer suggestion), and transfer history with expandable matchday groups.

Chart primary lines and series use blue. Lime is reserved for a single "this is you" data point or marker, if one exists.

### Top Stats — UC-10, GR-08

Six categories: top fantasy score, top scorers, top assists, top goal involvements, top clean sheets, and top cards.

The lead row gets stronger visual emphasis using soft blue. This screen has no primary action, so it gets no lime at all. Cards stay dense and comparable.

### Leaderboard — UC-11, GR-08, GR-09

Three modes: overall, matchday, and popular picks.

Components: summary block, overall/matchday/popular toggle, matchday tab strip, ranking table, sticky current-user row, zone color coding, admin badge, and popular players panel with pick count, pick rate, and captain count.

**Admin handling:** Admin users are excluded from normal ranking. They receive rank 0 and are displayed separately with a distinct admin tag. The frontend filters them from the ranked list so they don't take a spot from regular managers.

**User avatars:** Dicebear personas style with randomized pastel backgrounds (pink, lavender, mint, peach, light blue).

Zone colors:

| Zone | Color | Hex |
|---|---|---|
| Top | blue | #7aa2ff |
| Europa/warm | warm orange | #ffb06c |
| Conference | pink | #ff8fb0 |
| Pack | muted sage | #8b9285 |
| Drop/danger | soft red | #ff8f8f |
| Current user | lime outline | #c6f24a border |

The current-user marker is one of the three sanctioned lime uses — it's a single, meaningful, non-repeating highlight that doesn't collide with the zone colors.

### Toasts, Alerts, and Overlays — UC-03, UC-06

- **Toast stack:** fixed bottom center. Short and specific messages.
- **Rule alerts:** explain why a player or action is blocked.
- **Welcome overlay:** first-run onboarding.
- **Score overlay:** scoring explanation with game rules, prize pool, and nation-limit scaling table.
- **Guided tour:** target highlight with an instruction card. The highlight ring uses blue, not lime, to avoid confusion with live-status or primary-action pills.
- **Transfer warning modal:** when the user tries to leave with unsaved changes, a blocking modal asks them to stay or leave. The modal must be fully visible when shown — it uses the overlay open state with full opacity and pointer events.

### Account — UC-14

A centered card with avatar display, avatar picker (preset Dicebear seeds), display name edit form, account info section (username, email, role, user ID), and a sign out button. The avatar picker shows a row of preset persona seeds; selecting one updates both the account avatar and the sidebar avatar. The display name form validates 2–30 characters and submits via PATCH /me. The sign out button clears local state and signs out from Supabase Auth.

## 9. Data Flow — UC-01 to UC-12

The frontend exchanges data with the backend API. Public data (players, teams, matches, stats) is available without authentication. User-specific data (squad, transfers, analytics, leaderboard) requires authentication. Admin operations (stats loading) require admin role.

If the backend is unreachable, the app falls back to mock data for public catalog reads only. Authenticated calls never fall back — real auth failures show the login screen, not fake data.

## 10. Accessibility

- A skip link is always available.
- The sidebar is labeled as primary navigation.
- Each screen has a meaningful aria-label.
- Dialog overlays use proper role and aria-modal attributes with labeled headings.
- Icon-only controls have aria-labels.
- Active/current/locked/error states never rely on color alone.
- Focus states are visible on all interactive elements.

## 11. Copy Voice

Short, operational, specific. Use football/fantasy terms only where they reduce explanation. Avoid marketing copy inside tool surfaces.

- **Good:** "Sync completed match stats", "No leaderboard data for this matchday yet.", "Captain is required"
- **Avoid:** long onboarding-style explanations inside panels

Nav labels: Squad, Fixtures, Dashboard, Top Stats, Leaderboard.
Status labels: DEADLINE, OPEN/LOCKED, Live backend.
Action labels: Save squad, Make transfers, Update Data.

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

Update this document when a feature changes:

- Navigation or screen structure.
- Color palette or visual tokens.
- Core component vocabulary.
- Data flow or API usage.
- Auth or demo behavior.
- Accessibility contract.
- Responsive behavior.

Implementation checklist:

1. Use existing colors before adding new ones.
2. Add markup only when it is real runtime structure.
3. Put screen-specific styles in the matching CSS file.
4. Put shared primitives in shared CSS only if reused.
5. Keep backend API calls in the API client module.
6. Keep app orchestration in the boot module; screen modules own their own rendering.
7. Verify text fits at mobile and desktop widths.
8. Run the relevant API route against mock and live/error states.
9. **Before shipping any new color, check: is this lime? If yes — is it the primary commit action, the live pill, or the current-user marker? If not, use blue or a neutral instead.**
