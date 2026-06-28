# Fix Bracket Lines, Matchday Nav, and Demo Transfers

## Task 1: Fix missing bracket lines (bottom R32 matches)

**Root cause:** SVG connector Y positions are computed with `nodeY(i, n)` assuming evenly distributed nodes. Flexbox `justify-content: space-around` only produces matching positions if ALL nodes are identical height. Nodes with/without date labels have different heights, causing cumulative drift — worst at bottom (bracket_order 13-15: AUS vs EGY, SUI vs ALG, COL vs GHA).

**Fix:** Switch from flexbox distribution to absolute positioning of each bracket node at the exact `nodeY(i, n)` coordinate. This guarantees SVG lines align with nodes regardless of node height.

### Changes:
| File | Change |
|------|--------|
| `frontend/css/fixtures.css` | `.bracket-round__nodes`: remove flex layout, add `position: relative`. `.bracket-node`: add `position: absolute; left:0; right:0` |
| `frontend/js/fixtures.js` | In `renderKnockout()`, compute `top: nodeY(i,n)` for each node, add `transform: translateY(-50%)`. Use index-based loop instead of `for...of`. Handle partial match rounds (fill remaining with TBD). |

## Task 2: Enable full matchday navigation + restrict transfers

**Current:** `bindMatchdayNav()` already navigates up to `maxMd` (last in `_roundMeta`). `buildRoundMeta()` already builds metadata for all matchdays with fixtures. Issue: future knockout rounds (R16, QF, SF, Final) may not have fixtures yet, so they don't appear in `_roundMeta`.

**Fix:**
1. In `buildRoundMeta()`, add placeholder entries for ALL knockout stages (matchdays 4-8) even without fixtures, so navigation always reaches the Final.
2. Transfer restriction: user can make changes for current open matchday AND the next one. Modify `isWindowOpen()` or add a new check that allows the next matchday too.

### Changes:
| File | Change |
|------|--------|
| `frontend/js/app.js` | `buildRoundMeta()`: add placeholders for matchdays 4-8 if missing. Add `isTransferAllowed(md)` that checks if md is currentTransferMatchday or currentTransferMatchday+1. Use this in squad/transfer UI gating. |

## Task 3: Inject 5 demo transfers for markie (MD3 → MD4)

**Current MD3 squad (squad_id=3):**
- GK: Vozinha (214) $2.9
- DEF: Koundé (1430) $4.0, Van Dijk (796) $4.1, Cancelo (917) $3.9, Lee Han-Beom (719) $2.8
- MID: Olise (517) $7.0, Paquetá (190) $4.8, Ismail Yüksek (1188) $3.4, Lee Kang-In (736) $4.5
- FWD: Messi (38) $7.4, Kenan Yildiz (1204) $5.2
- Total: $50.0

**5 Transfers (MD4):**
| # | OUT | IN | Reason |
|---|-----|-----|--------|
| 1 | Lee Han-Beom 719 ($2.8) | Lindelöf ($3.0) | KOR eliminated |
| 2 | Lee Kang-In 736 ($4.5) | De Paul ($4.4) | KOR eliminated |
| 3 | Ismail Yüksek 1188 ($3.4) | Pape Matar Sarr ($4.2) | TUR eliminated |
| 4 | Olise 517 ($7.0) | Idrissa Gueye ($3.6) | Budget sacrifice for Haaland |
| 5 | Kenan Yildiz 1204 ($5.2) | Haaland ($7.7) | TUR eliminated |

**Result squad:** $2.9 + $4.0 + $4.1 + $3.9 + $3.0 + $4.8 + $4.4 + $4.2 + $3.6 + $7.4 + $7.7 = $50.0

**Method:** Direct SQL injection — create MD4 squad by copying MD3, then apply 5 transfers via `post_transfer()` logic (or direct SQL). Override transfer window check.

### Changes:
| File | Change |
|------|--------|
| DB (via `mcp0_execute_sql`) | 1. Copy MD3 squad to MD4. 2. Execute 5 player swaps. 3. Insert 5 transfer records. 4. Update budget. |

## Execution order:
1. Fix bracket lines (CSS + JS)
2. Fix matchday nav (app.js)
3. Query player IDs for incoming players
4. Inject transfers via SQL
5. Start dev server + browser preview to verify
