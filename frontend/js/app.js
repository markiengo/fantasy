const Toast = (() => {
  function show(message, type = "info", ms = 4000) {
    const region = document.getElementById("toastRegion");
    const el = document.createElement("div");
    el.className = `toast toast--${type} is-hidden`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    const messageEl = document.createElement("span");
    messageEl.textContent = message == null ? "" : String(message);
    const closeBtn = document.createElement("button");
    closeBtn.className = "toast__close";
    closeBtn.setAttribute("aria-label", t("squad.dismiss_tip"));
    closeBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';
    el.replaceChildren(messageEl, closeBtn);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add("is-hidden");
      setTimeout(() => el.remove(), 220);
    };

    closeBtn.addEventListener("click", close);
    region.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-hidden")));
    if (ms) setTimeout(close, ms);
  }

  return { show };
})();
window.Toast = Toast;

const RuleAlert = (() => {
  const DETAIL = {
    "Over budget": () => t("rule.over_budget_detail"),
    "Squad full (11)": () => t("rule.squad_full_detail"),
    "Already in squad": () => t("rule.already_in_detail"),
  };

  const TITLE = {
    "Over budget": () => t("rule.over_budget"),
    "Squad full (11)": () => t("rule.squad_full"),
    "Already in squad": () => t("rule.already_in"),
  };

  function resolveTitle(reason) {
    if (TITLE[reason]) return TITLE[reason]();
    var slotMatch = reason.match(/^No (\w+) slot left$/);
    if (slotMatch) return t("rule.no_slot", slotMatch[1]);
    var maxMatch = reason.match(/^Max (\d+) from one team$/);
    if (maxMatch) return t("rule.max_team", maxMatch[1]);
    return reason;
  }

  function resolveDetail(reason) {
    if (DETAIL[reason]) return DETAIL[reason]();
    var slotMatch = reason.match(/^No (\w+) slot left$/);
    if (slotMatch) return t("rule.no_slot", slotMatch[1]);
    var maxMatch = reason.match(/^Max (\d+) from one team$/);
    if (maxMatch) return t("rule.max_team_detail", maxMatch[1]);
    return reason;
  }

  function show(reason) {
    let region = document.getElementById("ruleAlertRegion");
    if (!region) {
      region = document.createElement("div");
      region.id = "ruleAlertRegion";
      region.className = "rule-alert-region";
      document.body.appendChild(region);
    }

    const el = document.createElement("div");
    el.className = "rule-alert is-hidden";
    el.setAttribute("role", "alert");
    el.innerHTML = `<span class="rule-alert__icon" aria-hidden="true">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v5m0 3h.01M10.3 3.9l-8 13.9A1.5 1.5 0 0 0 3.6 20h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-13.9a1.5 1.5 0 0 0-2.6 0Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span class="rule-alert__body">
        <span class="rule-alert__title">${escapeHtml(resolveTitle(reason))}</span>
        <span class="rule-alert__detail">${escapeHtml(resolveDetail(reason))}</span>
      </span>
      <button class="rule-alert__close" aria-label="${t("squad.dismiss_tip")}">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
      </button>`;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add("is-hidden");
      setTimeout(() => el.remove(), 220);
    };

    el.querySelector(".rule-alert__close").addEventListener("click", close);
    region.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-hidden")));
    setTimeout(close, 3800);
  }

  return { show };
})();
window.RuleAlert = RuleAlert;

const STAGE_LABEL = {
  group_stage: (md) => t("stage.group_stage", md),
  round_of_32: () => t("stage.round_of_32"),
  round_of_16: () => t("stage.round_of_16"),
  quarter_final: () => t("stage.quarter_final"),
  semi_final: () => t("stage.semi_final"),
  final: () => t("stage.final"),
};

let _roundMeta = [];
let _scoreByMd = {};
let _teamPane = "pitch";

const SCREEN_COPY = {
  team: { eyebrow: () => t("topbar.team_eyebrow"), title: () => t("topbar.team_title") },
  fixtures: { eyebrow: () => t("topbar.fixtures_eyebrow"), title: () => t("topbar.fixtures_title") },
  scores: { eyebrow: () => t("topbar.scores_eyebrow"), title: () => t("topbar.scores_title") },
  stats: { eyebrow: () => t("topbar.stats_eyebrow"), title: () => t("topbar.stats_title") },
  leaderboard: { eyebrow: () => t("topbar.leaderboard_eyebrow"), title: () => t("topbar.leaderboard_title") },
};

const THEME_KEY = "gaffer_theme";

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch (e) {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const root = document.documentElement;
  root.classList.add("theme-transitioning");
  root.setAttribute("data-theme", nextTheme);
  updateThemeToggle(nextTheme);
  requestAnimationFrame(function () {
    setTimeout(function () { root.classList.remove("theme-transitioning"); }, 280);
  });
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    // Ignore storage failures and keep the current session theme.
  }
}

function updateThemeToggle(theme) {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const isLight = theme === "light";
  const nextLabel = isLight ? t("topbar.switch_dark") : t("topbar.switch_light");
  btn.classList.toggle("is-active", isLight);
  btn.setAttribute("aria-pressed", String(isLight));
  btn.setAttribute("aria-label", nextLabel);
  btn.setAttribute("title", nextLabel);
}

function bindThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  updateThemeToggle(readStoredTheme());
  btn.addEventListener("click", () => {
    const nextTheme = readStoredTheme() === "light" ? "dark" : "light";
    persistTheme(nextTheme);
    applyTheme(nextTheme);
  });
}
function todayDateOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function matchDateOnly(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function currentRoundMeta(md = State.currentMatchday) {
  return _roundMeta.find((r) => r.matchday === md) || null;
}
function parseDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function roundLockTime(meta) {
  if (!meta) return null;
  const kickoff = parseDateTime(meta.firstKickoff);
  if (kickoff) return new Date(kickoff.getTime() - 60 * 60 * 1000);
  if (meta.date) return matchDateOnly(meta.date);
  return null;
}

function currentTransferMatchday() {
  if (!_roundMeta.length) return State.currentMatchday || 1;

  const now = new Date();
  let lastKnown = _roundMeta[0].matchday;
  for (const round of _roundMeta) {
    const lock = roundLockTime(round);
    if (!lock) continue;
    if (now < lock) return round.matchday;
    lastKnown = round.matchday;
  }

  return lastKnown;
}

function isWindowOpen(md) {
  const meta = currentRoundMeta(md);
  const lock = roundLockTime(meta);
  if (!lock) return true;
  return new Date() < lock;
}
window.isWindowOpen = isWindowOpen;

function isTransferAllowed(md) {
  const current = currentTransferMatchday();
  return md === current || md === current + 1;
}
window.isTransferAllowed = isTransferAllowed;

var _skipUnloadWarning = false;
var _usernameGateLocked = false;
var _usernameGateProfile = null;

function isDirtyUnsaved() {
  if (_skipUnloadWarning) return false;
  if (_usernameGateLocked) return false;
  if (State.mode === "transfer" && State.isDirty()) return true;
  if (hasTypedInput()) return true;
  return false;
}

function hasTypedInput() {
  var ids = ["playerSearch", "teamSearch", "authEmail", "authPassword", "authUsername", "usernameInput"];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el && el.offsetParent !== null && el.value && el.value.trim().length > 0) return true;
  }
  return false;
}

function switchScreen(name) {
  if (_usernameGateLocked) {
    enforceUsernameGate();
    return;
  }
  if (isDirtyUnsaved()) {
    showTransferWarning(function () { _doSwitchScreen(name); });
    return;
  }
  _doSwitchScreen(name);
}

function _doSwitchScreen(name) {
  State._activeScreen = name;
  State.save();
  const inner = document.querySelector(".main__inner");
  let bar = document.getElementById("screenLoader");
  if (!bar && inner) {
    bar = document.createElement("div");
    bar.id = "screenLoader";
    bar.className = "screen-loader";
    inner.prepend(bar);
  }
  if (bar) {
    bar.style.width = "0";
    bar.style.opacity = "1";
    requestAnimationFrame(() => {
      bar.style.width = "70%";
      setTimeout(() => {
        bar.style.width = "100%";
        setTimeout(() => { bar.style.opacity = "0"; }, 120);
      }, 200);
    });
  }

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === "screen-" + name);
  });
  document.querySelectorAll("[data-screen]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.screen === name);
  });

  updateTopbarCopy(name);

  if (name === "fixtures") {
    Fixtures.setRound(State.currentMatchday);
    Fixtures.render();
  }
  if (name === "scores") Scores.render();
  if (name === "stats") Stats.render();
  if (name === "leaderboard") Leaderboard.render();

  if (bar) {
    bar.style.width = "100%";
    setTimeout(() => { bar.style.opacity = "0"; }, 200);
    setTimeout(() => { bar.style.width = "0"; }, 400);
  }
}

function showTransferWarning(onLeave) {
  const modal = document.getElementById("transferWarning");
  if (!modal) { onLeave(); return; }
  modal.hidden = false;
  modal.classList.add("is-open");
  var bodyEl = modal.querySelector(".transfer-warning__body");
  if (bodyEl) {
    if (State.mode === "transfer" && State.isDirty()) {
      bodyEl.textContent = t("warning.body_transfers");
    } else if (hasTypedInput()) {
      bodyEl.textContent = t("warning.body_input");
    } else {
      bodyEl.textContent = t("warning.body_squad");
    }
  }
  const stayBtn = document.getElementById("transferWarningStay");
  const leaveBtn = document.getElementById("transferWarningLeave");
  function cleanup() {
    modal.hidden = true;
    modal.classList.remove("is-open");
    stayBtn.removeEventListener("click", onStay);
    leaveBtn.removeEventListener("click", onLeaveClick);
  }
  function onStay() { cleanup(); }
  function onLeaveClick() { cleanup(); onLeave(); }
  stayBtn.addEventListener("click", onStay);
  leaveBtn.addEventListener("click", onLeaveClick);
}

function updateTopbarCopy(name) {
  const copy = SCREEN_COPY[name] || SCREEN_COPY.team;
  const eyebrow = document.getElementById("topbarEyebrow");
  const title = document.getElementById("topbarTitle");
  if (eyebrow) eyebrow.textContent = copy.eyebrow();
  if (title) title.textContent = copy.title();
}

function buildRoundMeta() {
  const map = {};
  for (const match of State.fixtures) {
    if (!map[match.matchday]) {
      map[match.matchday] = {
        matchday: match.matchday,
        stage: match.stage,
        date: match.date,
        firstKickoff: match.kickoff || null,
      };
    }
    if (match.date && (!map[match.matchday].date || match.date < map[match.matchday].date)) {
      map[match.matchday].date = match.date;
    }
    const kickoff = parseDateTime(match.kickoff);
    const currentKickoff = parseDateTime(map[match.matchday].firstKickoff);
    if (kickoff && (!currentKickoff || kickoff < currentKickoff)) {
      map[match.matchday].firstKickoff = match.kickoff;
    }
  }
  // Ensure all knockout rounds exist even before fixtures are loaded.
  const knockoutStages = [
    { md: 4, stage: "round_of_32" },
    { md: 5, stage: "round_of_16" },
    { md: 6, stage: "quarter_final" },
    { md: 7, stage: "semi_final" },
    { md: 8, stage: "final" },
  ];
  for (const ks of knockoutStages) {
    if (!map[ks.md]) {
      map[ks.md] = { matchday: ks.md, stage: ks.stage, date: null, firstKickoff: null };
    }
  }
  _roundMeta = Object.values(map).sort((a, b) => a.matchday - b.matchday);
  for (const round of _roundMeta) {
    round.label = (STAGE_LABEL[round.stage] || STAGE_LABEL.group_stage)(round.matchday);
  }
}

function fmtShortDate(iso, kickoffIso) {
  var locale = t("date.locale") || "en-US";
  if (kickoffIso) {
    var d = new Date(kickoffIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    }
  }
  var parts = iso.split("-").map(Number);
  var d2 = new Date(parts[0], parts[1] - 1, parts[2]);
  return d2.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function updateShellSummary() {
  const meta = currentRoundMeta();
  const mdLabel = meta ? meta.label : t("stage.group_stage", State.currentMatchday);
  const headerMd = document.getElementById("headerMatchdayValue");
  const summary = document.getElementById("matchdaySummary");
  const transferWindow = document.getElementById("transferWindowStatus");
  const actionMdLabel = document.getElementById("actionMatchdayLabel");

  if (headerMd) headerMd.textContent = mdLabel;
  if (actionMdLabel) actionMdLabel.textContent = mdLabel;
  const modeLabel = document.getElementById("modeLabel");
  if (modeLabel) modeLabel.textContent = mdLabel;
  if (summary) {
    if (meta) {
      const lockCopy = isWindowOpen(meta.matchday) ? t("window.open") : t("window.locked");
      const datePart = meta.date ? ` - ${fmtShortDate(meta.date, meta.firstKickoff)}` : "";
      summary.textContent = `${mdLabel}${datePart} - ${lockCopy}`;
    } else {
      summary.textContent = mdLabel;
    }
  }
  if (transferWindow) {
    transferWindow.textContent = isWindowOpen(State.currentMatchday) ? t("window.open") : t("window.locked");
  }
}

function renderMatchdayStrip() {
  const track = document.getElementById("matchdayTrack");
  let html = "";

  for (const round of _roundMeta) {
    const active = round.matchday === State.currentMatchday;
    const complete = round.matchday < State.currentMatchday;
    let sub = round.date ? `<span class="round__date">${fmtShortDate(round.date, round.firstKickoff)}</span>` : "";

    if (active) {
      const allowed = isTransferAllowed(round.matchday);
      const open = isWindowOpen(round.matchday);
      sub = (allowed && open)
        ? `<span class="round__sub round__sub--open">${t("window.open")}</span>`
        : `<span class="round__sub round__sub--locked">${t("window.locked")}</span>`;
    } else if (complete && Object.prototype.hasOwnProperty.call(_scoreByMd, round.matchday)) {
      sub = `<span class="pill pill--pts">${t("points.pts", _scoreByMd[round.matchday])}</span>`;
    }

    html += `<button class="round ${active ? "is-active" : ""}" role="tab" aria-selected="${active}" data-md="${round.matchday}">
      <span class="round__name">${round.label}</span>
      ${sub}
    </button>`;
  }

  track.innerHTML = html;
  track.querySelectorAll(".round").forEach((btn) => {
    btn.addEventListener("click", () => selectMatchday(+btn.dataset.md));
  });
  updateShellSummary();
}

function updatePointsChip(md) {
  const el = document.getElementById("statPoints");
  if (!el) return;
  const pts = Object.prototype.hasOwnProperty.call(_scoreByMd, md) ? _scoreByMd[md] : null;
  el.textContent = pts != null ? t("points.pts", pts) : "-";
  const topbar = document.getElementById("topbarPoints");
  if (topbar) {
    let total = 0;
    for (const key in _scoreByMd) total = total + Number(_scoreByMd[key] || 0);
    topbar.textContent = String(total);
  }
}

function inferFormation(players) {
  const mids = players.filter((p) => p.position === "MID").length;
  const fwds = players.filter((p) => p.position === "FWD").length;
  if (mids === 4 && fwds === 2) return "4-4-2";
  return "4-3-3";
}

function hydrate(player) {
  let team_id = player.team_id;
  let team_name = player.team_name;
  if (!team_id) {
    const full = State.players.find((item) => item.player_id === player.player_id);
    if (full) {
      team_id = full.team_id;
      team_name = team_name || full.team_name;
    }
  }
  return {
    player_id: player.player_id,
    name: player.name,
    position: player.position,
    team_id,
    team_name,
    base_price: player.base_price,
    is_captain: player.is_captain || false,
  };
}
function applySquadForMatchday(squad, md, transfersUsed) {
  State.currentSquad.players = squad.players.map(hydrate);
  State.currentSquad.formation = inferFormation(State.currentSquad.players);
  const captain = State.currentSquad.players.find((p) => p.is_captain);
  State.currentSquad.captainId = captain ? captain.player_id : null;
  State.squadSaved = squad.matchday === md;
  State.transfersUsed = State.squadSaved ? transfersUsed : 0;
  State.setBaseline();
  State.mode = State.squadSaved ? "view" : "build";
  State.emit();
}

async function loadSquadForMatchday(md) {
  try {
    const [squad, transfersUsed] = await Promise.all([
      Api.getSquad(md),
      Transfers.fetchUsed(md),
    ]);
    applySquadForMatchday(squad, md, transfersUsed);
  } catch (e) {
    if (State.currentSquad.matchday !== md) State.currentSquad.players = [];
    const draft = State.currentSquad.players;
    State.currentSquad.players = [];
    State.setBaseline();
    State.currentSquad.players = draft;
    State.squadSaved = false;
    State.transfersUsed = 0;
    State.mode = "build";
    State.emit();
  }
}

async function selectMatchday(md) {
  State.setMatchday(md);
  State.transfersUsed = 0;
  State.emit();
  renderMatchdayStrip();
  updatePointsChip(md);
  await loadSquadForMatchday(md);

  const active = document.querySelector(".screen.is-active").id;
  if (active === "screen-fixtures") {
    Fixtures.setRound(md);
    Fixtures.render();
  }
  if (active === "screen-scores") Scores.render();
}

function selectMatchdayLight(md) {
  State.currentMatchday = md;
  State.currentSquad.matchday = md;
  State.save();
  renderMatchdayStrip();
  updatePointsChip(md);
  Fixtures.setRound(md);
  Fixtures.render();
}

function setTeamPane(name) {
  _teamPane = name;
  State._teamPane = name;
  State.save();
  document.querySelectorAll(".team-pane").forEach((pane) => {
    pane.classList.toggle("is-active", pane.dataset.pane === name);
  });
  document.querySelectorAll(".team-mobile-tabs__tab").forEach((tab) => {
    const active = tab.dataset.pane === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

let _mobileTabsBound = false;
function initTeamMobileTabs() {
  if (_mobileTabsBound) return;
  _mobileTabsBound = true;
  document.querySelectorAll(".team-mobile-tabs__tab").forEach((tab) => {
    tab.addEventListener("click", () => setTeamPane(tab.dataset.pane));
  });
}

let _navBound = false;
function bindNav() {
  if (_navBound) return;
  _navBound = true;
  document.querySelectorAll("[data-screen]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchScreen(link.dataset.screen);
    });
  });

  document.querySelectorAll("[data-pane-jump]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pane = link.dataset.paneJump;
      function go() { switchScreen("team"); setTeamPane(pane); }
      if (isDirtyUnsaved()) {
        showTransferWarning(go);
        return;
      }
      go();
    });
  });

  document.querySelectorAll("[data-command='transfers']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      function go() {
        switchScreen("team");
        if (State.mode === "view") {
          Transfers.enter();
          return;
        }
        setTeamPane("summary");
        if (State.mode === "build") {
          Toast.show(t("toast.save_before_transfers"), "info");
        }
      }
      if (isDirtyUnsaved()) {
        showTransferWarning(go);
        return;
      }
      go();
    });
  });

  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  menuBtn.addEventListener("click", () => {
    const open = !navLinks.classList.contains("is-open");
    navLinks.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });
}

async function refreshLiveData() {
  const md = State.currentMatchday;
  const [matches, players, teams] = await Promise.all([
    Api.getMatches(),
    Api.getPlayers(),
    Api.getTeams(),
  ]);
  const cumulative = await Api.getSquadScore().catch(() => ({}));
  State.fixtures = matches;
  State.players = players;
  State.teams = teams;
  _scoreByMd = {};
  for (const row of (cumulative.by_matchday || [])) {
    _scoreByMd[row.matchday] = Number(row.squad_score ?? 0);
  }
  buildRoundMeta();
  renderMatchdayStrip();
  updatePointsChip(md);
  await loadSquadForMatchday(md);
  const active = document.querySelector(".screen.is-active");
  if (!active) return;
  const name = active.id;
  if (name === "screen-fixtures") {
    Fixtures.setRound(md);
    Fixtures.render();
  }
  if (name === "screen-scores") Scores.render();
  if (name === "screen-stats") Stats.render();
  if (name === "screen-leaderboard") Leaderboard.render();
}

function bindUpdateData() {
  const btn = document.getElementById("updateDataBtn");
  const subtitle = document.getElementById("updateDataSubtitle");
  const label = btn ? btn.querySelector(".btn-update__title") : null;
  if (!btn || !subtitle || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.classList.add("is-loading");
    if (label) label.textContent = t("update.updating");
    const subtitles = [t("update.fetching"), t("update.player_stats"), t("update.squad_analytics")];
    let index = 0;
    subtitle.textContent = subtitles[index];
    const timer = setInterval(() => {
      index = (index + 1) % subtitles.length;
      subtitle.textContent = subtitles[index];
    }, 1200);

    try {
      const result = await Api.updateData();
      await refreshLiveData();
      subtitle.textContent = t("update.complete");
      Toast.show(t("toast.data_updated", result.inserted || 0, result.matches_updated || 0), "success");
    } catch (e) {
      subtitle.textContent = t("update.failed");
      Toast.show(e.message || t("toast.could_not_update"), "error");
    } finally {
      clearInterval(timer);
      btn.disabled = false;
      btn.setAttribute("aria-disabled", "false");
      btn.classList.remove("is-loading");
      if (label) label.textContent = t("update.data");
    }
  });
}

function bindMatchdayNav() {
  const goPrev = () => {
    if (State.currentMatchday > 1) selectMatchday(State.currentMatchday - 1);
  };

  const goNext = () => {
    const maxMd = _roundMeta.length ? _roundMeta[_roundMeta.length - 1].matchday : 8;
    if (State.currentMatchday < maxMd) selectMatchday(State.currentMatchday + 1);
  };

  const ids = ["mdPrev", "mdNext", "mdPrevDesk", "mdNextDesk"];
  for (const id of ids) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
  }

  document.getElementById("mdPrev").addEventListener("click", goPrev);
  document.getElementById("mdNext").addEventListener("click", goNext);
  const deskPrev = document.getElementById("mdPrevDesk");
  const deskNext = document.getElementById("mdNextDesk");
  if (deskPrev) deskPrev.addEventListener("click", goPrev);
  if (deskNext) deskNext.addEventListener("click", goNext);
}

function bindHelpButtons() {
  const onboarding = document.getElementById("openOnboardingBtn");
  if (onboarding && onboarding.dataset.bound !== "1") {
    onboarding.dataset.bound = "1";
    onboarding.addEventListener("click", () => {
      if (window.Onboarding) Onboarding.open();
    });
  }

  const replayTour = document.getElementById("replayTourBtn");
  if (replayTour && replayTour.dataset.bound !== "1") {
    replayTour.dataset.bound = "1";
    replayTour.addEventListener("click", () => {
      if (window.Tour) Tour.start();
    });
  }
}

function updateAuthMode(mode) {
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const usernameField = document.getElementById("authUsernameField");
  const passwordField = document.getElementById("authPasswordField");
  const options = document.getElementById("authOptions");
  const submitBtn = document.getElementById("authSubmitBtn");
  const separator = document.getElementById("authSeparator");
  const googleBtn = document.getElementById("googleSignInBtn");
  const googleText = document.getElementById("googleSignInText");
  const modeText = document.getElementById("authModeText");
  const toggleBtn = document.getElementById("authToggleBtn");
  const emailLabel = document.querySelector('label[for="authEmail"]');
  const emailInput = document.getElementById("authEmail");

  if (mode === "login") {
    title.textContent = t("login.welcome_back");
    subtitle.style.display = "none";
    if (usernameField) usernameField.hidden = true;
    passwordField.hidden = false;
    options.hidden = false;
    submitBtn.textContent = t("login.log_in");
    separator.hidden = false;
    googleBtn.hidden = false;
    googleText.textContent = t("login.sign_in_google");
    if (emailLabel) emailLabel.textContent = t("login.email_or_username");
    if (emailInput) emailInput.placeholder = t("login.enter_email_or_username");
    if (modeText) modeText.textContent = t("login.dont_have_account");
    if (toggleBtn) toggleBtn.textContent = t("login.sign_up");
  } else if (mode === "signup") {
    title.textContent = t("login.create_account");
    subtitle.style.display = "none";
    if (usernameField) usernameField.hidden = false;
    passwordField.hidden = false;
    options.hidden = true;
    submitBtn.textContent = t("login.sign_up");
    separator.hidden = false;
    googleBtn.hidden = false;
    googleText.textContent = t("login.sign_up_google");
    if (emailLabel) emailLabel.textContent = t("login.email");
    if (emailInput) emailInput.placeholder = t("login.enter_email");
    if (modeText) modeText.textContent = t("login.already_have_account");
    if (toggleBtn) toggleBtn.textContent = t("login.log_in");
  } else if (mode === "reset") {
    title.textContent = t("login.reset_password");
    subtitle.textContent = t("login.reset_subtitle");
    subtitle.style.display = "";
    if (usernameField) usernameField.hidden = true;
    passwordField.hidden = true;
    options.hidden = true;
    submitBtn.textContent = t("login.send_reset_link");
    separator.hidden = true;
    googleBtn.hidden = true;
    if (emailLabel) emailLabel.textContent = t("login.email");
    if (emailInput) emailInput.placeholder = t("login.enter_email");
    if (modeText) modeText.textContent = t("login.remember_password");
    if (toggleBtn) toggleBtn.textContent = t("login.log_in");
  }
}

function showLoginScreen() {
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("appScreen");
  if (login) login.style.display = "";
  if (app) app.style.display = "none";
  hideAuthOverlay();
}

function setAuthOverlayBody(body, beforeKey, email, afterKey) {
  if (!body) return;
  const strong = document.createElement("strong");
  strong.textContent = email || "";
  body.replaceChildren(
    document.createTextNode(t(beforeKey) + " "),
    strong,
    document.createTextNode(". " + t(afterKey))
  );
}

function showAuthOverlay(type, email) {
  const overlay = document.getElementById("authOverlay");
  const card = document.querySelector(".login-screen__card");
  const title = document.getElementById("authOverlayTitle");
  const body = document.getElementById("authOverlayBody");
  if (!overlay) return;
  if (card) card.style.display = "none";
  if (type === "signup") {
    if (title) title.textContent = t("auth.check_email");
    setAuthOverlayBody(body, "auth.confirmation_sent", email, "auth.click_to_activate");
  } else if (type === "reset") {
    if (title) title.textContent = t("auth.reset_sent");
    setAuthOverlayBody(body, "auth.reset_link_sent", email, "auth.check_inbox");
  }
  overlay.style.display = "";
}

function hideAuthOverlay() {
  const overlay = document.getElementById("authOverlay");
  const card = document.querySelector(".login-screen__card");
  if (overlay) overlay.style.display = "none";
  if (card) card.style.display = "";
}

function resetAppStateForSession() {
  if (_freshLogin) {
    State.currentSquad = { matchday: 1, formation: "4-3-3", players: [], captainId: null };
  }
  State.squadSaved = false;
  State.transfersUsed = 0;
}

async function enterAuthenticatedApp() {
  resetAppStateForSession();
  showAppScreen();
  await continueBoot();
}

function setAppGateInert(locked) {
  const app = document.getElementById("appScreen");
  if (!app) return;
  if (locked) {
    app.inert = true;
    app.setAttribute("aria-hidden", "true");
  } else {
    app.inert = false;
    app.removeAttribute("aria-hidden");
  }
}

function enforceUsernameGate(profile) {
  if (profile) _usernameGateProfile = profile;
  if (_usernameGateProfile) showUsernameModal(_usernameGateProfile);
}

function usernameProfileErrorMessage(err) {
  const detail = err && err.message ? err.message : "";
  if (err && err.status === 400) return t("username.invalid");
  if (detail.indexOf("Display name") !== -1) return t("username.invalid");
  if (detail === "Username already taken") return t("username.taken");
  if (detail === "Profile already completed") return t("username.profile_completed");
  return t("username.could_not_set");
}

function showUsernameModal(profile) {
  const modal = document.getElementById("usernameModal");
  if (!modal) return;

  _usernameGateLocked = true;
  _usernameGateProfile = profile || _usernameGateProfile || {};
  setAppGateInert(true);

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const login = document.getElementById("loginScreen");
  if (login) login.style.display = "none";

  const avatar = document.getElementById("usernameModalAvatar");
  const nameEl = document.getElementById("usernameModalName");
  const emailEl = document.getElementById("usernameModalEmail");

  profile = _usernameGateProfile || {};

  if (avatar && profile.avatar_url) {
    avatar.src = profile.avatar_url;
    avatar.style.display = "";
  } else if (avatar) {
    avatar.style.display = "none";
  }
  if (nameEl) nameEl.textContent = profile.name || "";
  if (emailEl) emailEl.textContent = profile.email || "";

  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "flex";

  const form = document.getElementById("usernameForm");
  const input = document.getElementById("usernameInput");
  const feedback = document.getElementById("usernameFeedback");
  const submitBtn = document.getElementById("usernameSubmitBtn");

  if (input) input.focus();

  if (input && input.dataset.usernameCheckBound !== "1") {
    input.dataset.usernameCheckBound = "1";
    input.addEventListener("input", () => {
      if (feedback) {
        feedback.textContent = "";
        feedback.className = "username-modal__feedback";
      }
    });
  }

  if (form && form.dataset.usernameSubmitBound !== "1") {
    form.dataset.usernameSubmitBound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const displayName = input ? input.value.trim() : "";
      if (!displayName || displayName.length < 2 || displayName.length > 30) {
        if (feedback) {
          feedback.textContent = t("username.invalid");
          feedback.className = "username-modal__feedback is-error";
        }
        return;
      }
      if (submitBtn) { submitBtn.classList.add("btn--loading"); submitBtn.disabled = true; }
      try {
        await Api.completeProfile(displayName);
        hideUsernameModal({ completed: true });
        await enterAuthenticatedApp();
      } catch (err) {
        if (feedback) {
          feedback.textContent = usernameProfileErrorMessage(err);
          feedback.className = "username-modal__feedback is-error";
        }
      } finally {
        if (submitBtn) { submitBtn.classList.remove("btn--loading"); submitBtn.disabled = false; }
      }
    });
  }
}

function hideUsernameModal(options) {
  if (_usernameGateLocked && (!options || options.completed !== true)) {
    enforceUsernameGate();
    return;
  }
  _usernameGateLocked = false;
  _usernameGateProfile = null;
  setAppGateInert(false);
  const modal = document.getElementById("usernameModal");
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }
}

function showAppScreen() {
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("appScreen");
  if (login) login.style.display = "none";
  if (app) app.style.display = "";
}

async function boot() {
  State.load();
  _teamPane = State._teamPane || "pitch";
  applyTheme(readStoredTheme());

  window.addEventListener("beforeunload", (e) => {
    if (isDirtyUnsaved()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  window.addEventListener("keydown", (e) => {
    if ((e.key === "F5") || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r")) {
      if (isDirtyUnsaved()) {
        e.preventDefault();
        showTransferWarning(function () {
          window.location.reload();
        });
      }
    }
  });

  if (window.onAuthStateChange) {
    await window.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        _freshLogin = true;
        const loginScreen = document.getElementById("loginScreen");
        if (loginScreen && loginScreen.style.display !== "none") {
          await swapToApp();
        }
      } else if (event === "INITIAL_SESSION" && session) {
        _freshLogin = false;
        const loginScreen = document.getElementById("loginScreen");
        if (loginScreen && loginScreen.style.display !== "none") {
          await swapToApp();
        }
      }
    });
  }

  const googleSignInBtn = document.getElementById("googleSignInBtn");
  const emailLoginForm = document.getElementById("emailLoginForm");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const authToggleBtn = document.getElementById("authToggleBtn");
  let authMode = "login";

  function swapToLogin() {
    showLoginScreen();
  }

  async function swapToApp() {
    await enterAuthenticatedApp();
  }

  window.addEventListener("auth-unauthorized", () => {
    Progress.done();
    Toast.show(t("toast.session_expired"), "error");
    if (window.supabaseAuth) {
      window.supabaseAuth.auth.signOut().catch(() => {});
    }
    swapToLogin();
  });

  window.addEventListener("auth-forbidden", (e) => {
    const detail = e && e.detail && e.detail.detail ? e.detail.detail : t("toast.no_permission");
    if (detail === "Username required") return;
    if (window.Toast) Toast.show(detail, "error");
  });

  if (authToggleBtn) {
    authToggleBtn.addEventListener("click", () => {
      authMode = authMode === "login" ? "signup" : "login";
      updateAuthMode(authMode);
    });
  }

  const passwordToggle = document.getElementById("passwordToggle");
  if (passwordToggle) {
    passwordToggle.addEventListener("click", () => {
      const input = document.getElementById("authPassword");
      if (!input) return;
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      passwordToggle.setAttribute("aria-pressed", String(!isText));
      passwordToggle.setAttribute("aria-label", isText ? t("login.show_password") : t("login.hide_password"));
    });
  }

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", async () => {
      _skipUnloadWarning = true;
      setAuthLoading(true);
      try {
        await window.signInWithGoogle();
      } catch (error) {
        _skipUnloadWarning = false;
        setAuthLoading(false);
        Toast.show(error.message || t("toast.google_failed"), "error");
      }
    });
  }

  function setAuthLoading(loading) {
    const submitBtn = document.getElementById("authSubmitBtn");
    const googleBtn = document.getElementById("googleSignInBtn");
    if (loading) {
      if (submitBtn) { submitBtn.classList.add("btn--loading"); submitBtn.disabled = true; }
      if (googleBtn) { googleBtn.classList.add("btn--loading"); googleBtn.disabled = true; }
    } else {
      if (submitBtn) { submitBtn.classList.remove("btn--loading"); submitBtn.disabled = false; }
      if (googleBtn) { googleBtn.classList.remove("btn--loading"); googleBtn.disabled = false; }
    }
  }

  const authOverlayBack = document.getElementById("authOverlayBack");
  if (authOverlayBack) {
    authOverlayBack.addEventListener("click", () => {
      hideAuthOverlay();
      updateAuthMode("login");
      authMode = "login";
    });
  }

  if (emailLoginForm) {
    emailLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailOrUser = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      const usernameInput = document.getElementById("authUsername");
      const username = usernameInput ? usernameInput.value.trim() : "";
      var rememberInput = document.getElementById("authRemember");
      var remember = rememberInput ? rememberInput.checked : true;
      var formFeedback = document.getElementById("authFormFeedback");
      if (formFeedback) { formFeedback.textContent = ""; formFeedback.className = "auth-form__feedback"; }
      setAuthLoading(true);
      try {
        if (authMode === "login") {
          await window.signIn(emailOrUser, password, remember);
          await swapToApp();
        } else if (authMode === "signup") {
          if (!username || username.length < 2 || username.length > 30) {
            Toast.show(t("username.invalid"), "error");
            setAuthLoading(false);
            return;
          }
          await window.signUp(emailOrUser, password, username);
          showAuthOverlay("signup", emailOrUser);
          authMode = "login";
        } else if (authMode === "reset") {
          await window.resetPassword(emailOrUser);
          showAuthOverlay("reset", emailOrUser);
          authMode = "login";
        }
      } catch (error) {
        var msg = error.message || t("toast.auth_failed");
        if (msg === "Invalid login credentials") msg = t("toast.wrong_credentials");
        Toast.show(msg, "error");
        var formFeedback = document.getElementById("authFormFeedback");
        if (formFeedback) {
          formFeedback.textContent = msg;
          formFeedback.className = "auth-form__feedback is-error";
        }
      } finally {
        setAuthLoading(false);
      }
    });
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
      authMode = "reset";
      updateAuthMode(authMode);
    });
  }

  const session = await window.getCurrentSession();

  if (!session) {
    showLoginScreen();
    return;
  }

  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      try {
        localStorage.removeItem("wcf2026");
        await window.signOut();
        window.location.reload();
      } catch (error) {
        Toast.show(error.message || t("toast.signout_failed"), "error");
      }
    });
  }

  await swapToApp();
}

let _booted = false;
let _freshLogin = false;

async function continueBoot() {
  if (_booted) return;
  _booted = true;

  Squad.showSkeleton();
  Progress.start();

  bindNav();
  bindMatchdayNav();
  bindUpdateData();
  bindHelpButtons();
  bindThemeToggle();
  initTeamMobileTabs();
  setTeamPane(_teamPane);

  let me = null;
  try {
    me = await Api.getMe();
  } catch (e) {
    if (e.status === 403 && e.message === "Username required") {
      Progress.done();
      const session = await window.getCurrentSession();
      if (session) {
        const user = session.user;
        const userMetadata = user.user_metadata || {};
        showUsernameModal({
          email: user.email,
          name: userMetadata.full_name || userMetadata.name,
          avatar_url: userMetadata.avatar_url,
        });
      }
      _booted = false;
      return;
    }
    Progress.done();
    Toast.show(t("toast.verify_failed"), "error");
    if (window.supabaseAuth) {
      window.supabaseAuth.auth.signOut().catch(() => {});
    }
    swapToLogin();
    _booted = false;
    return;
  }

  if (me.needs_username) {
    Progress.done();
    enforceUsernameGate(me);
    _booted = false;
    return;
  }

  _usernameGateLocked = false;
  _usernameGateProfile = null;
  setAppGateInert(false);

  const profileName = document.querySelector(".profile__name");
  if (profileName && me.display_name) profileName.textContent = me.display_name;

  const managerAvatar = document.getElementById("managerAvatar");
  if (managerAvatar) {
    const seed = me.display_name || me.user_id || "Gaffer";
    managerAvatar.style.backgroundImage = "url('https://api.dicebear.com/9.x/personas/svg?seed=" + encodeURIComponent(seed) + "&backgroundColor=ffd5dc,e6d4f0,c4f0e8,ffe8c4,d4e8ff&radius=50')";
  }

  if (me.role === "admin") {
    window._isAdmin = true;
    const updateBtn = document.getElementById("updateDataBtn");
    if (updateBtn) updateBtn.hidden = false;
  }

  if (me.user_id) window._userId = me.user_id;

  Onboarding.maybeShow();
  updateTopbarCopy("team");

  Squad.init();
  Fixtures.init();
  Leaderboard.init();

  State.subscribe(() => {
    updateShellSummary();
  });

  let md = State.currentMatchday;

  let players = [];
  let teams = [];
  let matches = [];
  let cumulative = {};
  let rawSquad = null;
  let transfersUsed = 0;

  try {
    [players, teams, matches, cumulative] = await Promise.all([
      Api.getPlayers(),
      Api.getTeams(),
      Api.getMatches(),
      Api.getSquadScore().catch(() => ({})),
    ]);
  } catch (e) {
    Toast.show(t("toast.load_failed"), "error");
  }

  Progress.set(50);

  State.players = players;
  State.teams = teams;
  State.fixtures = matches;

  _scoreByMd = {};
  for (const row of (cumulative.by_matchday || [])) {
    _scoreByMd[row.matchday] = Number(row.squad_score ?? 0);
  }

  buildRoundMeta();
  md = _freshLogin ? currentTransferMatchday() : (State.currentMatchday || currentTransferMatchday());
  State.setMatchday(md);

  try {
    [rawSquad, transfersUsed] = await Promise.all([
      Api.getSquad(md).catch(() => null),
      Transfers.fetchUsed(md),
    ]);
  } catch (e) {
    rawSquad = null;
    transfersUsed = 0;
  }

  Progress.done();

  renderMatchdayStrip();
  updatePointsChip(md);
  Squad.buildTeamSearch();

  if (rawSquad && rawSquad.players && rawSquad.players.length) {
    applySquadForMatchday(rawSquad, md, transfersUsed);
  } else {
    if (_freshLogin || !State.currentSquad.players || !State.currentSquad.players.length) {
      State.currentSquad = { matchday: md, formation: "4-3-3", players: [], captainId: null };
    } else {
      State.currentSquad.matchday = md;
    }
    State.setBaseline();
    State.squadSaved = false;
    State.transfersUsed = 0;
    State.mode = "build";
    State.emit();
  }

  Squad.renderPitch();
  Squad.renderSummary();
  Squad.renderPool();
  Squad.renderProgressChecklist();
  Squad.renderTipBanner();

  var savedScreen = State._activeScreen || "team";
  if (savedScreen !== "team") {
    _doSwitchScreen(savedScreen);
  }
}

window.addEventListener("lang-changed", function () {
  var active = document.querySelector(".screen.is-active");
  if (!active) return;
  var name = active.id.replace("screen-", "");
  updateTopbarCopy(name);
  renderMatchdayStrip();
  if (name === "team") {
    Squad.renderPitch();
    Squad.renderSummary();
    Squad.renderPool();
    Squad.renderProgressChecklist();
    Squad.renderTipBanner();
  }
  if (name === "fixtures") {
    Fixtures.setRound(State.currentMatchday);
    Fixtures.render();
  }
  if (name === "scores") Scores.render();
  if (name === "stats") Stats.render();
  if (name === "leaderboard") Leaderboard.render();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}



