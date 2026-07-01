const Toast = (() => {
  function show(message, type = "info", ms = 4000) {
    const region = document.getElementById("toastRegion");
    const el = document.createElement("div");
    el.className = `toast toast--${type} is-hidden`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = `<span>${message}</span>
      <button class="toast__close" aria-label="Dismiss">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
      </button>`;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add("is-hidden");
      setTimeout(() => el.remove(), 220);
    };

    el.querySelector(".toast__close").addEventListener("click", close);
    region.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-hidden")));
    if (ms) setTimeout(close, ms);
  }

  return { show };
})();
window.Toast = Toast;

const RuleAlert = (() => {
  const DETAIL = {
    "Over budget": "You do not have enough remaining budget to afford this player.",
    "Squad full (11)": "Remove a player from the pitch before adding someone new.",
    "Already in squad": "This player is already in your squad.",
    "Max 3 from one team": "You can only keep three players from the same national team.",
  };

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
        <span class="rule-alert__title">${reason}</span>
        <span class="rule-alert__detail">${DETAIL[reason] || reason}</span>
      </span>
      <button class="rule-alert__close" aria-label="Dismiss">
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
  group_stage: (md) => `Round ${md}`,
  round_of_32: () => "Round of 32",
  round_of_16: () => "Round of 16",
  quarter_final: () => "Quarter-final",
  semi_final: () => "Semi-final",
  final: () => "Final",
};

let _roundMeta = [];
let _scoreByMd = {};
let _teamPane = "pitch";

const SCREEN_COPY = {
  team: { eyebrow: "TEAM MANAGEMENT", title: "Build your matchday squad" },
  fixtures: { eyebrow: "TOURNAMENT", title: "Fixtures & standings" },
  scores: { eyebrow: "PERFORMANCE", title: "Season dashboard" },
  stats: { eyebrow: "TOURNAMENT", title: "Top player stats" },
};

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
  for (const round of _roundMeta) {
    const lock = roundLockTime(round);
    if (!lock || now < lock) return round.matchday;
  }

  return _roundMeta[_roundMeta.length - 1].matchday;
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

function switchScreen(name) {
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
    requestAnimationFrame(() => { bar.style.width = "70%"; });
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

  if (bar) {
    bar.style.width = "100%";
    setTimeout(() => { bar.style.opacity = "0"; }, 200);
    setTimeout(() => { bar.style.width = "0"; }, 400);
  }
}

function updateTopbarCopy(name) {
  const copy = SCREEN_COPY[name] || SCREEN_COPY.team;
  const eyebrow = document.getElementById("topbarEyebrow");
  const title = document.getElementById("topbarTitle");
  if (eyebrow) eyebrow.textContent = copy.eyebrow;
  if (title) title.textContent = copy.title;
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

function fmtShortDate(iso) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}

function updateBackendState() {
  const isMock = Api.isMock();
  const badge = document.getElementById("backendStateBadge");
  const label = isMock ? "Demo data" : "Live backend";

  if (badge) {
    badge.textContent = label;
    badge.classList.toggle("shell-pill--live", !isMock);
    badge.classList.toggle("shell-pill--demo", isMock);
  }
}

function updateShellSummary() {
  const meta = currentRoundMeta();
  const mdLabel = meta ? meta.label : `Round ${State.currentMatchday}`;
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
      const lockCopy = isWindowOpen(meta.matchday) ? "Transfers open" : "Transfers locked";
      const datePart = meta.date ? ` - ${fmtShortDate(meta.date)}` : "";
      summary.textContent = `${mdLabel}${datePart} - ${lockCopy}`;
    } else {
      summary.textContent = mdLabel;
    }
  }
  if (transferWindow) {
    transferWindow.textContent = isWindowOpen(State.currentMatchday) ? "Transfers open" : "Transfers locked";
  }
}

function renderMatchdayStrip() {
  const track = document.getElementById("matchdayTrack");
  let html = "";

  for (const round of _roundMeta) {
    const active = round.matchday === State.currentMatchday;
    const complete = round.matchday < State.currentMatchday;
    let sub = round.date ? `<span class="round__date">${fmtShortDate(round.date)}</span>` : "";

    if (active) {
      const allowed = isTransferAllowed(round.matchday);
      const open = isWindowOpen(round.matchday);
      sub = (allowed && open)
        ? `<span class="round__sub round__sub--open">Transfers open</span>`
        : `<span class="round__sub round__sub--locked">Transfers locked</span>`;
    } else if (complete && Object.prototype.hasOwnProperty.call(_scoreByMd, round.matchday)) {
      sub = `<span class="pill pill--pts">${_scoreByMd[round.matchday]} pts</span>`;
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
  el.textContent = pts != null ? `${pts} pts` : "-";
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

function setTeamPane(name) {
  _teamPane = name;
  document.querySelectorAll(".team-pane").forEach((pane) => {
    pane.classList.toggle("is-active", pane.dataset.pane === name);
  });
  document.querySelectorAll(".team-mobile-tabs__tab").forEach((tab) => {
    const active = tab.dataset.pane === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function initTeamMobileTabs() {
  document.querySelectorAll(".team-mobile-tabs__tab").forEach((tab) => {
    tab.addEventListener("click", () => setTeamPane(tab.dataset.pane));
  });
}

function bindNav() {
  document.querySelectorAll("[data-screen]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchScreen(link.dataset.screen);
    });
  });

  document.querySelectorAll("[data-pane-jump]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchScreen("team");
      setTeamPane(link.dataset.paneJump);
    });
  });

  document.querySelectorAll("[data-command='transfers']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchScreen("team");
      if (State.mode === "view") {
        Transfers.enter();
        return;
      }
      setTeamPane("summary");
      if (State.mode === "build") {
        Toast.show("Save a squad before making transfers.", "info");
      }
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
  const matches = await Api.getMatches();
  const cumulative = await Api.getScore().catch(() => ({}));
  State.fixtures = matches;
  _scoreByMd = {};
  for (const row of (cumulative.by_matchday || [])) {
    _scoreByMd[row.matchday] = Number(row.score ?? row.squad_score ?? 0);
  }
  buildRoundMeta();
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

function bindUpdateData() {
  const btn = document.getElementById("updateDataBtn");
  const subtitle = document.getElementById("updateDataSubtitle");
  const label = btn ? btn.querySelector(".btn-update__title") : null;
  if (!btn || !subtitle) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.classList.add("is-loading");
    if (label) label.textContent = "Updating";
    const subtitles = ["Fetching latest scores...", "Updating player stats...", "Refreshing squad analytics..."];
    let index = 0;
    subtitle.textContent = subtitles[index];
    const timer = setInterval(() => {
      index = (index + 1) % subtitles.length;
      subtitle.textContent = subtitles[index];
    }, 1200);

    try {
      const result = await Api.updateData();
      await refreshLiveData();
      subtitle.textContent = "Data update complete";
      Toast.show(`Data updated: ${result.inserted || 0} stats added, ${result.matches_updated || 0} matches refreshed.`, "success");
    } catch (e) {
      subtitle.textContent = "Update failed";
      Toast.show(e.message || "Could not update data.", "error");
    } finally {
      clearInterval(timer);
      btn.disabled = false;
      btn.setAttribute("aria-disabled", "false");
      btn.classList.remove("is-loading");
      if (label) label.textContent = "Update Data";
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

  document.getElementById("mdPrev").addEventListener("click", goPrev);
  document.getElementById("mdNext").addEventListener("click", goNext);
  const deskPrev = document.getElementById("mdPrevDesk");
  const deskNext = document.getElementById("mdNextDesk");
  if (deskPrev) deskPrev.addEventListener("click", goPrev);
  if (deskNext) deskNext.addEventListener("click", goNext);
}

function bindHelpButtons() {
  const onboarding = document.getElementById("openOnboardingBtn");
  if (onboarding) {
    onboarding.addEventListener("click", () => {
      if (window.Onboarding) Onboarding.open();
    });
  }

  const replayTour = document.getElementById("replayTourBtn");
  if (replayTour) {
    replayTour.addEventListener("click", () => {
      if (window.Tour) Tour.start();
    });
  }
}

function updateAuthMode(mode) {
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const passwordField = document.getElementById("authPasswordField");
  const options = document.getElementById("authOptions");
  const submitBtn = document.getElementById("authSubmitBtn");
  const separator = document.getElementById("authSeparator");
  const googleBtn = document.getElementById("googleSignInBtn");
  const googleText = document.getElementById("googleSignInText");
  const modeText = document.getElementById("authModeText");
  const toggleBtn = document.getElementById("authToggleBtn");

  if (mode === "login") {
    title.textContent = "Welcome back";
    subtitle.style.display = "none";
    passwordField.hidden = false;
    options.hidden = false;
    submitBtn.textContent = "Log In";
    separator.hidden = false;
    googleBtn.hidden = false;
    googleText.textContent = "Sign In with Google";
    if (modeText) modeText.textContent = "Don't have an account?";
    if (toggleBtn) toggleBtn.textContent = "Sign Up";
  } else if (mode === "signup") {
    title.textContent = "Create account";
    subtitle.style.display = "none";
    passwordField.hidden = false;
    options.hidden = true;
    submitBtn.textContent = "Sign Up";
    separator.hidden = false;
    googleBtn.hidden = false;
    googleText.textContent = "Sign Up with Google";
    if (modeText) modeText.textContent = "Already have an account?";
    if (toggleBtn) toggleBtn.textContent = "Log In";
  } else if (mode === "reset") {
    title.textContent = "Reset password";
    subtitle.textContent = "Enter your email and we'll send you a reset link";
    subtitle.style.display = "";
    passwordField.hidden = true;
    options.hidden = true;
    submitBtn.textContent = "Send reset link";
    separator.hidden = true;
    googleBtn.hidden = true;
    if (modeText) modeText.textContent = "Remember your password?";
    if (toggleBtn) toggleBtn.textContent = "Log In";
  }
}

function showLoginScreen() {
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("appScreen");
  if (login) login.style.display = "";
  if (app) app.style.display = "none";
  hideAuthOverlay();
}

function showAuthOverlay(type, email) {
  const overlay = document.getElementById("authOverlay");
  const card = document.querySelector(".login-screen__card");
  const title = document.getElementById("authOverlayTitle");
  const body = document.getElementById("authOverlayBody");
  if (!overlay) return;
  if (card) card.style.display = "none";
  if (type === "signup") {
    if (title) title.textContent = "Check your email";
    if (body) body.innerHTML = "We sent a confirmation link to <strong>" + email + "</strong>. Click the link to activate your account.";
  } else if (type === "reset") {
    if (title) title.textContent = "Reset link sent";
    if (body) body.innerHTML = "We sent a password reset link to <strong>" + email + "</strong>. Check your inbox and follow the link to reset your password.";
  }
  overlay.style.display = "";
}

function hideAuthOverlay() {
  const overlay = document.getElementById("authOverlay");
  const card = document.querySelector(".login-screen__card");
  if (overlay) overlay.style.display = "none";
  if (card) card.style.display = "";
}

function showAppScreen() {
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("appScreen");
  if (login) login.style.display = "none";
  if (app) app.style.display = "";
}

function showGuestBanner() {
  const banner = document.getElementById("guestBanner");
  if (banner) banner.hidden = false;
}

function hideGuestBanner() {
  const banner = document.getElementById("guestBanner");
  if (banner) banner.hidden = true;
}

async function boot() {
  State.load();

  window.addEventListener("beforeunload", () => {
    if (sessionStorage.getItem("gaffer_no_persist") === "1") {
      if (window.supabaseAuth) {
        window.supabaseAuth.auth.signOut().catch(() => {});
      }
    }
  });

  const googleSignInBtn = document.getElementById("googleSignInBtn");
  const emailLoginForm = document.getElementById("emailLoginForm");
  const guestBtn = document.getElementById("guestBtn");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const authToggleBtn = document.getElementById("authToggleBtn");
  const guestBannerClose = document.getElementById("guestBannerClose");
  const guestBannerSignIn = document.getElementById("guestBannerSignIn");
  let authMode = "login";

  function swapToLogin() {
    showLoginScreen();
    hideGuestBanner();
  }

  async function swapToApp() {
    showAppScreen();
    _booted = false;
    await continueBoot();
  }

  async function enterDemoMode() {
    Api.setDemoToken();
    showAppScreen();
    Toast.show("Logged in as demo user.", "success");
    _booted = false;
    await continueBoot();
  }

  window.addEventListener("auth-unauthorized", () => {
    Toast.show("Session expired. Please sign in again.", "error");
    if (window.supabaseAuth) {
      window.supabaseAuth.auth.signOut().catch(() => {});
    }
    swapToLogin();
  });

  window.addEventListener("auth-forbidden", (e) => {
    const detail = e && e.detail && e.detail.detail ? e.detail.detail : "You do not have permission to do that.";
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
      passwordToggle.setAttribute("aria-label", isText ? "Show password" : "Hide password");
    });
  }

  if (guestBtn) {
    guestBtn.addEventListener("click", enterDemoMode);
  }

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", async () => {
      try {
        await window.signInWithGoogle();
      } catch (error) {
        Toast.show(error.message || "Google sign-in failed", "error");
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
      const email = document.getElementById("authEmail").value;
      const password = document.getElementById("authPassword").value;
      const remember = document.getElementById("authRemember")?.checked ?? true;
      setAuthLoading(true);
      try {
        if (authMode === "login") {
          await window.signIn(email, password, remember);
          await swapToApp();
        } else if (authMode === "signup") {
          await window.signUp(email, password);
          showAuthOverlay("signup", email);
          authMode = "login";
        } else if (authMode === "reset") {
          await window.resetPassword(email);
          showAuthOverlay("reset", email);
          authMode = "login";
        }
      } catch (error) {
        Toast.show(error.message || "Authentication failed", "error");
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

  if (guestBannerClose) {
    guestBannerClose.addEventListener("click", hideGuestBanner);
  }

  if (guestBannerSignIn) {
    guestBannerSignIn.addEventListener("click", () => {
      if (window.supabaseAuth) {
        window.supabaseAuth.auth.signOut().catch(() => {});
      }
      window.location.reload();
    });
  }

  const session = await window.getCurrentSession();

  if (!session && !Api.isDemo()) {
    showLoginScreen();
    return;
  }

  if (Api.isDemo()) {
    await swapToApp();
    return;
  }

  try {
    const me = await Api.getMe();
    const profileName = document.querySelector(".profile__name");
    if (profileName && me.display_name) profileName.textContent = me.display_name;
    if (me.role !== "admin") {
      const updateBtn = document.getElementById("updateDataBtn");
      if (updateBtn) updateBtn.style.display = "none";
    }
  } catch (e) {
    if (e.status === 401) {
      Toast.show("Session expired. Please sign in again.", "error");
      if (window.supabaseAuth) {
        await window.supabaseAuth.auth.signOut().catch(() => {});
      }
    } else {
      Toast.show("Could not verify your session. Please sign in again.", "error");
    }
    showLoginScreen();
    return;
  }

  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      try {
        if (Api.isDemo()) {
          Api.clearDemoToken();
        } else {
          await window.signOut();
        }
        _booted = false;
        swapToLogin();
      } catch (error) {
        Toast.show(error.message || "Sign out failed", "error");
      }
    });
  }

  await swapToApp();
}

let _booted = false;

async function continueBoot() {
  if (_booted) return;
  _booted = true;

  Onboarding.maybeShow();
  updateTopbarCopy("team");

  Squad.init();
  Fixtures.init();
  bindNav();
  bindMatchdayNav();
  bindUpdateData();
  bindHelpButtons();
  initTeamMobileTabs();
  setTeamPane(_teamPane);

  State.subscribe(() => {
    updateShellSummary();
  });
  window.addEventListener("backend-mode-changed", updateBackendState);

  Squad.showSkeleton();
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
      Api.getScore().catch(() => ({})),
    ]);
  } catch (e) {
    Toast.show("Could not load data. Retry the request.", "error");
  }

  State.players = players;
  State.teams = teams;
  State.fixtures = matches;

  _scoreByMd = {};
  for (const row of (cumulative.by_matchday || [])) {
    _scoreByMd[row.matchday] = Number(row.score ?? row.squad_score ?? 0);
  }

  buildRoundMeta();
  md = currentTransferMatchday();
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

  renderMatchdayStrip();
  updatePointsChip(md);
  updateBackendState();
  Squad.buildTeamSearch();

  if (rawSquad && rawSquad.players && rawSquad.players.length) {
    applySquadForMatchday(rawSquad, md, transfersUsed);
  } else {
    State.currentSquad.players = [];
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}


