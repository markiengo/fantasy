/* ============================================================================
   howtoscore.js — right-panel toggle (Add Players ⇄ How to Score) and the
   scoring guide itself. Point values MIRROR app/core/scoring.py exactly:
     goals       FWD/MID +5, DEF/GK +6
     assists     +3
     clean sheet DEF/GK +4
     minutes     60+ → +2, 1–59 → +1
     yellow      -1
     red         -3
   If scoring.py changes, update the tables below to match.
   ============================================================================ */

const HowToScore = (() => {
  // position-independent rules — shown on every tab
  const common = [
    { label: "Appearance", note: "up to 60 mins", pts: 1 },
    { label: "Appearance", note: "60+ minutes", pts: 2 },
    { label: "Assist", pts: 3 },
    { label: "Yellow card", pts: -1 },
    { label: "Red card", pts: -3 },
  ];

  // each scope lists its position-specific bonuses first, then the shared rules
  const tables = {
    all: common,
    gkdef: [
      { label: "Goal scored", pts: 6 },
      { label: "Clean sheet", pts: 4 },
      ...common,
    ],
    midfwd: [
      { label: "Goal scored", pts: 5 },
      ...common,
    ],
  };

  const notes = {
    all: "Applies to every player, whatever their position.",
    gkdef: "Goalkeepers and defenders — plus all the all-player points.",
    midfwd: "Midfielders and forwards — plus all the all-player points.",
  };

  function rowHtml(r) {
    const cls = r.pts >= 0 ? "is-pos" : "is-neg";
    const sign = r.pts > 0 ? "+" : "";   // negatives already carry their minus
    const note = r.note ? ` <span class="scorerow__note">(${r.note})</span>` : "";
    return `<li class="scorerow">
      <span class="scorerow__label">${r.label}${note}</span>
      <span class="scorerow__pts mono ${cls}">${sign}${r.pts}</span>
    </li>`;
  }

  function renderScope(scope) {
    const list = document.getElementById("scoreList");
    const note = document.getElementById("scoreNote");
    if (!list) return;
    let html = "";
    for (const r of tables[scope]) html += rowHtml(r);
    list.innerHTML = html;
    if (note) note.textContent = notes[scope] || "";
  }

  function init() {
    const toggle = document.getElementById("poolToggle");
    const tabs = document.getElementById("scoreTabs");
    if (!toggle || !tabs) return;

    // top-level pane toggle: Add Players ⇄ How to Score
    toggle.querySelectorAll(".segmented__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pane = btn.dataset.pane;
        toggle.querySelectorAll(".segmented__btn").forEach((b) => {
          const on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", String(on));
        });
        document.getElementById("pane-players").classList.toggle("is-active", pane === "players");
        document.getElementById("pane-score").classList.toggle("is-active", pane === "score");
      });
    });

    // scoring sub-tabs: All Players / GK & DEF / MID & FWD
    tabs.querySelectorAll(".scoretab").forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.querySelectorAll(".scoretab").forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        renderScope(tab.dataset.scope);
      });
    });

    renderScope("all");
  }

  return { init, renderScope };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", HowToScore.init);
} else {
  HowToScore.init();
}
