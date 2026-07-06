const HowToScore = (() => {
  const common = [
    { label: () => t("hts.appearance"), note: () => t("hts.up_to_60"), pts: 1 },
    { label: () => t("hts.appearance"), note: () => t("hts.60_plus"), pts: 2 },
    { label: () => t("hts.assist"), pts: 3 },
  ];

  const tables = {
    all: common,
    gkdef: [
      { label: () => t("hts.goal_scored"), pts: 7 },
      { label: () => t("hts.clean_sheet"), pts: 4 },
      { label: () => t("hts.saves"), note: () => t("hts.gk_only"), pts: 1 },
      ...common,
    ],
    midfwd: [
      { label: () => t("hts.goal_scored"), pts: 5 },
      { label: () => t("hts.shots_on_target"), note: () => t("hts.fwd_mid_only"), pts: 1 },
      ...common,
    ],
    deductions: [
      { label: () => t("hts.yellow"), pts: -1 },
      { label: () => t("hts.red"), pts: -3 },
      { label: () => t("hts.own_goals"), pts: -3 },
      { label: () => t("hts.fouls_committed"), pts: -0.5 },
      { label: () => t("hts.offsides"), pts: -0.25 },
      { label: () => t("hts.goals_conceded"), note: () => t("hts.gk_def_only"), pts: -0.5 },
    ],
  };

  const notes = {
    all: () => t("hts.note_all"),
    gkdef: () => t("hts.note_gkdef"),
    midfwd: () => t("hts.note_midfwd"),
    deductions: () => t("hts.note_deductions"),
  };

  const prizes = [
    { rank: () => t("score_overlay.1st"), amount: "400,000 VND", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { rank: () => t("score_overlay.2nd"), amount: "200,000 VND", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { rank: () => t("score_overlay.3rd"), amount: "100,000 VND", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  ];

  const rules = [
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 1-3 2.5s1.3 2 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5a3 3 0 0 1-3-1.5" stroke-linecap="round"/></svg>', title: () => t("rules.budget_cap"), text: () => t("rules.budget_cap_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M14 20c0-2 1-3.5 3-4" stroke-linecap="round"/></svg>', title: () => t("rules.squad_size"), text: () => t("rules.squad_size_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M9 5v14" stroke-linecap="round"/></svg>', title: () => t("rules.formations"), text: () => t("rules.formations_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V4l8-2 8 2v18M4 12l8-2 8 2M12 2v20" stroke-linecap="round" stroke-linejoin="round"/></svg>', title: () => t("rules.team_limit"), text: () => t("rules.team_limit_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h10M18 7l3-3M18 7l3 3M14 7c0 2-2 4-5 4s-5 2-5 5v6M14 7c0 2 2 4 5 4s5 2 5 5v6" stroke-linecap="round" stroke-linejoin="round"/></svg>', title: () => t("rules.transfers"), text: () => t("rules.transfers_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke-linecap="round"/></svg>', title: () => t("rules.transfer_lock"), text: () => t("rules.transfer_lock_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke-linecap="round" stroke-linejoin="round"/></svg>', title: () => t("rules.captain"), text: () => t("rules.captain_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v20" stroke-linecap="round" stroke-linejoin="round"/></svg>', title: () => t("rules.carryover"), text: () => t("rules.carryover_text") },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18H6zM6 9h12M6 15h12M10 3v18" stroke-linecap="round"/></svg>', title: () => t("rules.tiebreaker"), text: () => t("rules.tiebreaker_text") },
  ];

  function rowHtml(r) {
    const cls = r.pts >= 0 ? "is-pos" : "is-neg";
    const sign = r.pts > 0 ? "+" : "";
    const label = typeof r.label === "function" ? r.label() : r.label;
    const note = r.note ? ` <span class="scorerow__note">(${typeof r.note === "function" ? r.note() : r.note})</span>` : "";
    return `<li class="scorerow">
      <span class="scorerow__label">${label}${note}</span>
      <span class="scorerow__pts ${cls}">${sign}${r.pts}</span>
    </li>`;
  }

  function renderRules() {
    const container = document.getElementById("scoreOverlayRules");
    if (!container) return;

    let prizesHtml = '<div class="score-prizes">';
    prizesHtml += '<span class="score-prizes__label">' + t("score_overlay.prize_pool") + '</span>';
    prizesHtml += '<div class="score-prizes__grid">';
    for (const p of prizes) {
      prizesHtml += '<div class="score-prizes__item">';
      prizesHtml += '<span class="score-prizes__icon">' + p.icon + '</span>';
      prizesHtml += '<span class="score-prizes__rank">' + (typeof p.rank === "function" ? p.rank() : p.rank) + '</span>';
      prizesHtml += '<span class="score-prizes__amount">' + p.amount + '</span>';
      prizesHtml += '</div>';
    }
    prizesHtml += '</div></div>';

    let rulesHtml = '<ul class="score-rules-list">';
    for (const r of rules) {
      rulesHtml += '<li class="score-rules-item">';
      rulesHtml += '<span class="score-rules-item__icon">' + r.icon + '</span>';
      rulesHtml += '<span class="score-rules-item__text"><b>' + (typeof r.title === "function" ? r.title() : r.title) + '</b> — ' + (typeof r.text === "function" ? r.text() : r.text) + '</span>';
      rulesHtml += '</li>';
    }
    rulesHtml += '</ul>';

    var stages = [
      { stage: () => t("nation_scale.gs_r32"), limit: 3 },
      { stage: () => t("nation_scale.r16"), limit: 4 },
      { stage: () => t("nation_scale.qf"), limit: 5 },
      { stage: () => t("nation_scale.sf"), limit: 6 },
      { stage: () => t("nation_scale.final"), limit: 8 },
    ];
    var scaleHtml = '<div class="nation-scale">';
    scaleHtml += '<span class="nation-scale__label">' + t("nation_scale.label") + '</span>';
    scaleHtml += '<div class="nation-scale__grid">';
    for (var s = 0; s < stages.length; s++) {
      scaleHtml += '<div class="nation-scale__cell">';
      scaleHtml += '<span class="nation-scale__stage">' + stages[s].stage() + '</span>';
      scaleHtml += '<span class="nation-scale__num">' + stages[s].limit + '</span>';
      scaleHtml += '</div>';
    }
    scaleHtml += '</div></div>';

    container.innerHTML = prizesHtml + rulesHtml + scaleHtml;
  }

  function renderScope(scope, listId = "scoreOverlayList", noteId = "scoreOverlayNote") {
    const list = document.getElementById(listId);
    const note = document.getElementById(noteId);
    const rulesEl = document.getElementById("scoreOverlayRules");

    if (scope === "rules") {
      if (list) list.hidden = true;
      if (note) note.hidden = true;
      if (rulesEl) { rulesEl.hidden = false; renderRules(); }
      return;
    }

    if (rulesEl) rulesEl.hidden = true;
    if (list) list.hidden = false;
    if (note) note.hidden = false;
    if (!list) return;

    let html = "";
    for (const r of tables[scope] || tables.all) {
      html += rowHtml(r);
    }
    list.innerHTML = html;
    if (note) note.textContent = (typeof notes[scope] === "function" ? notes[scope]() : notes[scope]) || "";
  }

  function close() {
    const overlay = document.getElementById("scoreOverlay");
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    setTimeout(() => { overlay.hidden = true; }, 220);
  }

  function open() {
    const overlay = document.getElementById("scoreOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    renderScope("rules");
    const tabs = document.getElementById("scoreOverlayTabs");
    if (tabs) {
      tabs.querySelectorAll(".scoretab").forEach((tab) => {
        const active = tab.dataset.scope === "rules";
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-open")));
  }

  function initOverlay() {
    const openBtn = document.getElementById("scoreHelpBtn");
    const closeBtn = document.getElementById("scoreOverlayClose");
    const overlay = document.getElementById("scoreOverlay");
    const tabs = document.getElementById("scoreOverlayTabs");

    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = "1";
      openBtn.addEventListener("click", open);
    }
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "1";
      closeBtn.addEventListener("click", close);
    }
    if (overlay && !overlay.dataset.bound) {
      overlay.dataset.bound = "1";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    }
    if (tabs && !tabs.dataset.bound) {
      tabs.dataset.bound = "1";
      tabs.querySelectorAll(".scoretab").forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.querySelectorAll(".scoretab").forEach((t) => {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", String(active));
          });
          renderScope(tab.dataset.scope);
        });
      });
    }

  }

  return { init: initOverlay, open, close, renderScope };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", HowToScore.init);
} else {
  HowToScore.init();
}
