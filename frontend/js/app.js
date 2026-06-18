/* ============================================================================
   app.js — bootstrap + cross-cutting: Toast, screen switching, nav menu,
            MatchdayNavigation strip, initial data load.
   Loaded last; orchestrates the feature modules.
   ============================================================================ */

/* ----------------------------------------------------------------- Toast --- */
const Toast = (() => {
  function show(message, type = "info", ms = 4000) {
    const region = document.getElementById("toastRegion");
    const el = document.createElement("div");
    el.className = `toast toast--${type} is-hidden`;   // start hidden, then transition in
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = `<span>${message}</span>
      <button class="toast__close" aria-label="Dismiss">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:16px;height:16px"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
      </button>`;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add("is-hidden");          // transition out to the same place it entered
      setTimeout(() => el.remove(), 220);
    };
    el.querySelector(".toast__close").addEventListener("click", close);
    region.appendChild(el);
    // double rAF: let the hidden state paint, then release so the entrance transitions
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-hidden")));
    if (ms) setTimeout(close, ms);
  }
  return { show };
})();
window.Toast = Toast;

/* --------------------------------------------------------------- RuleAlert --- */
const RuleAlert = (() => {
  const DETAIL = {
    "Over budget":      "You don't have enough remaining budget to afford this player.",
    "Squad full (11)":  "Remove a player from the pitch before adding someone new.",
    "Already in squad": "This player is already on your team.",
    "Max 3 from one team": "You can have at most 3 players from the same national team.",
  };

  const ICONS = {
    budget:   `<circle cx="12" cy="12" r="9"/><path d="M12 6v1.5m0 9V18m2.5-6a2.5 2.5 0 01-2.5 2.5H10a2 2 0 000 4h1m1-10.5a2 2 0 00-2 2"/>`,
    full:     `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
    duplicate:`<path d="M20 6L9 17l-5-5"/>`,
    team:     `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>`,
    position: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>`,
  };

  function iconKey(reason) {
    if (reason === "Over budget") return "budget";
    if (reason.startsWith("Squad full")) return "full";
    if (reason === "Already in squad") return "duplicate";
    if (reason.startsWith("Max")) return "team";
    return "position";
  }

  function show(reason) {
    let region = document.getElementById("ruleAlertRegion");
    if (!region) {
      region = document.createElement("div");
      region.id = "ruleAlertRegion";
      region.className = "rule-alert-region";
      document.body.appendChild(region);
    }

    const detail = DETAIL[reason] || reason;
    const icon = ICONS[iconKey(reason)];

    const el = document.createElement("div");
    el.className = "rule-alert is-hidden";
    el.setAttribute("role", "alert");
    el.innerHTML =
      `<span class="rule-alert__icon" aria-hidden="true">` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px">${icon}</svg>` +
      `</span>` +
      `<span class="rule-alert__body">` +
        `<span class="rule-alert__title">${reason}</span>` +
        `<span class="rule-alert__detail">${detail}</span>` +
      `</span>` +
      `<button class="rule-alert__close" aria-label="Dismiss">` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" style="width:15px;height:15px"><path d="M6 6l12 12M18 6L6 18"/></svg>` +
      `</button>`;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add("is-hidden");
      setTimeout(() => el.remove(), 280);
    };
    el.querySelector(".rule-alert__close").addEventListener("click", close);
    region.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-hidden")));
    setTimeout(close, 4000);
  }

  return { show };
})();
window.RuleAlert = RuleAlert;

/* ------------------------------------------------------- screen switching --- */
const STAGE_LABEL = {
  group_stage: (md) => `Round ${md}`,
  round_of_32: () => "Round of 32",
  round_of_16: () => "Round of 16",
  quarter_final: () => "Quarter-final",
  semi_final: () => "Semi-final",
  final: () => "Final",
};

function switchScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
  document.getElementById("screen-" + name).classList.add("is-active");
  document.querySelectorAll(".nav__link").forEach((l) => {
    l.classList.toggle("is-active", l.dataset.screen === name);
  });
  // The matchday round strip is only meaningful on My Team / Scores — hide it on Fixtures
  // (which has its own round navigation).
  document.getElementById("matchdayNav").hidden = (name === "fixtures");
  if (name === "fixtures") { Fixtures.setRound(State.currentMatchday); Fixtures.render(); }
  if (name === "scores") Scores.render();
}

/* ------------------------------------------------- MatchdayNavigation strip --- */
let _roundMeta = [];   // [{matchday, stage, label, date}]
let _scoreByMd = {};   // matchday -> cumulative score (for completed pills)

function buildRoundMeta() {
  const map = {};
  for (const m of State.fixtures) {
    if (!map[m.matchday]) map[m.matchday] = { matchday: m.matchday, stage: m.stage, date: m.date, kickoff: m.kickoff };
    if (m.kickoff && (!map[m.matchday].kickoff || m.kickoff < map[m.matchday].kickoff)) {
      map[m.matchday].kickoff = m.kickoff;
      map[m.matchday].date = m.date;
    }
  }
  _roundMeta = Object.values(map).sort((a, b) => a.matchday - b.matchday);
  for (const r of _roundMeta) r.label = (STAGE_LABEL[r.stage] || STAGE_LABEL.group_stage)(r.matchday);
}

// GR-07: window locks 1 hour before the earliest kickoff of the matchday.
function isWindowOpen(md) {
  const meta = _roundMeta.find((r) => r.matchday === md);
  if (!meta || !meta.kickoff) return true;
  const lockTime = new Date(new Date(meta.kickoff).getTime() - 60 * 60 * 1000);
  return new Date() < lockTime;
}

function fmtShortDate(iso) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}

function renderMatchdayStrip() {
  const track = document.getElementById("matchdayTrack");
  let html = "";
  for (const r of _roundMeta) {
    const isActive = r.matchday === State.currentMatchday;
    const isCompleted = r.matchday < State.currentMatchday;
    let sub = `<span class="round__date">${fmtShortDate(r.date)}</span>`;
    if (isActive) {
      sub = isWindowOpen(r.matchday)
        ? `<span class="round__sub round__sub--open">Transfers open</span>`
        : `<span class="round__sub round__sub--locked">Transfers locked</span>`;
    }
    // Only show a pts pill when a REAL score exists for that round — never a fabricated "0 pts".
    else if (isCompleted && Object.prototype.hasOwnProperty.call(_scoreByMd, r.matchday)) {
      sub = `<span class="pill pill--pts">${_scoreByMd[r.matchday]} pts</span>`;
    }
    html += `<button class="round ${isActive ? "is-active" : ""}" role="tab"
        aria-selected="${isActive}" data-md="${r.matchday}">
      <span class="round__name">${r.label}</span>
      ${sub}
    </button>`;
  }
  track.innerHTML = html;
  track.querySelectorAll(".round").forEach((btn) => {
    btn.addEventListener("click", () => selectMatchday(+btn.dataset.md));
  });
}

function updatePointsChip(md) {
  const el = document.getElementById("statPoints");
  if (!el) return;
  const pts = Object.prototype.hasOwnProperty.call(_scoreByMd, md) ? _scoreByMd[md] : null;
  el.textContent = pts != null ? pts + " pts" : "—";
}

async function selectMatchday(md) {
  State.setMatchday(md);
  renderMatchdayStrip();
  updatePointsChip(md);
  await loadSquadForMatchday(md);
  // refresh whichever screen is active
  const active = document.querySelector(".screen.is-active").id;
  if (active === "screen-fixtures") { Fixtures.setRound(md); Fixtures.render(); }
  if (active === "screen-scores") Scores.render();
}

/* Matchday workflow (UI-contract §9): load saved squad if it exists.
   Backfills team_id from the players list (the GET /squad payload historically
   omitted it → flags rendered as placeholders until re-added). */
function hydrate(p) {
  let team_id = p.team_id, team_name = p.team_name;
  if (!team_id) {
    const full = State.players.find((x) => x.player_id === p.player_id);
    if (full) { team_id = full.team_id; team_name = team_name || full.team_name; }
  }
  return { player_id: p.player_id, name: p.name, position: p.position, team_id, team_name, base_price: p.base_price };
}
async function loadSquadForMatchday(md) {
  try {
    const squad = await Api.getSquad(md);
    State.currentSquad.players = squad.players.map(hydrate);
    State.squadSaved = true;
    State.transfersUsed = await Transfers.fetchUsed(md);
    State.setBaseline();              // saved state is the baseline for "Cancel"
    State.mode = "view";              // saved squad is read-only until "Make transfers"
    State.emit();
  } catch (e) {
    // 404 → no saved squad. Keep any persisted draft for this md, but the
    // baseline is "empty" (nothing saved yet) so Cancel reverts to empty.
    if (State.currentSquad.matchday !== md) State.currentSquad.players = [];
    const keep = State.currentSquad.players;
    State.currentSquad.players = [];
    State.setBaseline();
    State.currentSquad.players = keep;
    State.squadSaved = false;
    State.transfersUsed = 0;
    State.mode = "build";             // no squad yet → build + Save
    State.emit();
  }
}

/* ------------------------------------------------------------- bootstrap --- */
async function boot() {
  State.load();

  // first-launch welcome overlay (how the game works) — no-op on return visits
  Onboarding.maybeShow();

  // wire feature modules
  Squad.init();
  Fixtures.init();

  // nav
  document.querySelectorAll(".nav__link").forEach((l) => {
    l.addEventListener("click", (e) => { e.preventDefault(); switchScreen(l.dataset.screen); });
  });
  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("is-open");
  });
  // The "Make transfers" / "Confirm transfers" button is wired in Squad.init()
  // (its action depends on the current mode).

  // matchday strip prev/next
  document.getElementById("mdPrev").addEventListener("click", () => {
    const i = _roundMeta.findIndex((r) => r.matchday === State.currentMatchday);
    if (i > 0) selectMatchday(_roundMeta[i - 1].matchday);
  });
  document.getElementById("mdNext").addEventListener("click", () => {
    const i = _roundMeta.findIndex((r) => r.matchday === State.currentMatchday);
    if (i >= 0 && i < _roundMeta.length - 1) selectMatchday(_roundMeta[i + 1].matchday);
  });

  // show skeleton immediately so the pitch doesn't sit blank while loading
  Squad.showSkeleton();

  const md = State.currentMatchday;

  // fire all boot requests in parallel — one round trip instead of 4-5 sequential
  let players = [], teams = [], matches = [], cum = {}, rawSquad = null, transfersUsed = 0;
  try {
    [players, teams, matches, cum, rawSquad, transfersUsed] = await Promise.all([
      Api.getPlayers(),
      Api.getTeams(),
      Api.getMatches(),
      Api.getScore().catch(() => ({})),
      Api.getSquad(md).catch(() => null),
      Transfers.fetchUsed(md),
    ]);
  } catch (e) {
    Toast.show("Could not load data.", "error");
  }

  State.players = players;
  State.teams = teams;
  State.fixtures = matches;

  for (const row of (cum.by_matchday || [])) _scoreByMd[row.matchday] = Number(row.score ?? row.squad_score ?? 0);

  buildRoundMeta();
  renderMatchdayStrip();
  updatePointsChip(md);
  Squad.buildTeamSearch();

  // apply the already-fetched squad instead of making another network call
  if (rawSquad && rawSquad.players && rawSquad.players.length) {
    State.currentSquad.players = rawSquad.players.map(hydrate);
    State.squadSaved = true;
    State.transfersUsed = transfersUsed;
    State.setBaseline();
    State.mode = "view";
    State.emit();
  } else {
    State.currentSquad.players = [];
    State.setBaseline();
    State.squadSaved = false;
    State.transfersUsed = 0;
    State.mode = "build";
    State.emit();
  }

  // initial render
  Squad.renderPitch();
  Squad.renderSummary();
  Squad.renderPool();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
