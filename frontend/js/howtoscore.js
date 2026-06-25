const HowToScore = (() => {
  const common = [
    { label: "Appearance", note: "up to 60 mins", pts: 1 },
    { label: "Appearance", note: "60+ minutes", pts: 2 },
    { label: "Assist", pts: 3 },
    { label: "Yellow card", pts: -1 },
    { label: "Red card", pts: -3 },
  ];

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
    gkdef: "Goalkeepers and defenders also earn clean-sheet points and score +6 for goals.",
    midfwd: "Midfielders and forwards score +5 for goals, plus the shared points.",
  };

  function rowHtml(r) {
    const cls = r.pts >= 0 ? "is-pos" : "is-neg";
    const sign = r.pts > 0 ? "+" : "";
    const note = r.note ? ` <span class="scorerow__note">(${r.note})</span>` : "";
    return `<li class="scorerow">
      <span class="scorerow__label">${r.label}${note}</span>
      <span class="scorerow__pts ${cls}">${sign}${r.pts}</span>
    </li>`;
  }

  function renderScope(scope, listId = "scoreOverlayList", noteId = "scoreOverlayNote") {
    const list = document.getElementById(listId);
    const note = document.getElementById(noteId);
    if (!list) return;

    let html = "";
    for (const r of tables[scope] || tables.all) {
      html += rowHtml(r);
    }
    list.innerHTML = html;
    if (note) note.textContent = notes[scope] || "";
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
    renderScope("all");
    const tabs = document.getElementById("scoreOverlayTabs");
    if (tabs) {
      tabs.querySelectorAll(".scoretab").forEach((tab) => {
        const active = tab.dataset.scope === "all";
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

    const legacyTabs = document.getElementById("scoreTabs");
    if (legacyTabs && !legacyTabs.dataset.bound) {
      legacyTabs.dataset.bound = "1";
      legacyTabs.querySelectorAll(".scoretab").forEach((tab) => {
        tab.addEventListener("click", () => {
          legacyTabs.querySelectorAll(".scoretab").forEach((t) => {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", String(active));
          });
          renderScope(tab.dataset.scope, "scoreList", "scoreNote");
        });
      });
      renderScope("all", "scoreList", "scoreNote");
    }
  }

  return { init: initOverlay, open, close, renderScope };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", HowToScore.init);
} else {
  HowToScore.init();
}
