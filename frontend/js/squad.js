/* ============================================================================
   squad.js — My Team: Pitch (flipped FWD→GK, real markings), top stat bar,
   right-side PlayerPool with player.py-style filters (name, position,
   multi-select teams, max_price), monogram avatars, per-player remove, Save/Cancel.
   ============================================================================ */

const Squad = (() => {
  const filter = { name: "", position: "", teams: new Set(), max_price: null, sort: "default" };
  let introDone = false;   // pitch rows stagger-rise on the first paint only

  // Pitch rows top→bottom: FWD (front/top) ... GK (back/bottom) — flipped per request.
  const ROW_ORDER = ["FWD", "MID", "DEF", "GK"];

  const PITCH_MARKINGS = `
    <div class="pitch__lines" aria-hidden="true">
      <span class="pl-box pl-box--top"></span>
      <span class="pl-goal pl-goal--top"></span>
      <span class="pl-halfway"></span>
      <span class="pl-circle"></span>
      <span class="pl-spot"></span>
      <span class="pl-box pl-box--bottom"></span>
      <span class="pl-goal pl-goal--bottom"></span>
    </div>`;

  function initials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  // Deterministic generated avatar (DiceBear). Seeded per player so it's stable.
  // Transparent bg → sits on the position-colored circle; monogram shows if it fails to load.
  function avatarUrl(p) {
    const seed = encodeURIComponent(`${p.name}-${p.team_id}-${p.player_id}`);
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
  }
  function faceHtml(p, sm) {
    return `<span class="face ${sm ? "face--sm" : ""}" data-pos="${p.position}">
      <span class="face__mono">${initials(p.name)}</span>
      <img src="${avatarUrl(p)}" alt="" loading="lazy" onerror="this.remove()" />
    </span>`;
  }

  /* ---------------------------------------------------------------- Pitch --- */
  function renderPitch() {
    const pitch = document.getElementById("pitch");
    // intro stagger plays once; set the gate BEFORE innerHTML so the new rows match it
    if (introDone) pitch.classList.remove("pitch--intro");
    else pitch.classList.add("pitch--intro");
    const need = FORMATIONS[State.currentSquad.formation];
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of State.currentSquad.players) byPos[p.position].push(p);

    let rows = "";
    for (const pos of ROW_ORDER) {
      let row = `<div class="pitch__row">`;
      for (let i = 0; i < need[pos]; i++) {
        const player = byPos[pos][i];
        row += player ? filledSlot(player) : emptySlot(pos);
      }
      row += `</div>`;
      rows += row;
    }
    pitch.innerHTML = PITCH_MARKINGS + rows;
    introDone = true;
    State.lastAddedId = null;   // the pop has rendered; don't replay it on later renders

    pitch.querySelectorAll(".slot__remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        State.removePlayer(+btn.closest(".slot").dataset.pid);
      });
    });

    // tapping an empty slot's "+" overrides the pool filter to that position
    pitch.querySelectorAll(".slot--empty .slot__card").forEach((btn) => {
      btn.addEventListener("click", () => filterByPosition(btn.closest(".slot").dataset.pos));
    });
  }

  // Point the player pool at a single position (used by the empty-slot "+").
  // Overrides whatever position filter was set, and flips the right panel back
  // to "Add Players" if the scoring guide is showing.
  function filterByPosition(pos) {
    filter.position = pos;
    document.querySelectorAll("#posChips .chip").forEach((c) => {
      c.classList.toggle("is-active", c.dataset.pos === pos);
    });
    const playersTab = document.querySelector('#poolToggle [data-pane="players"]');
    if (playersTab && !playersTab.classList.contains("is-active")) playersTab.click();
    renderPool();
    // on the stacked (mobile) layout the pool sits below the pitch — bring it up
    document.querySelector(".pool").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function emptySlot(pos) {
    return `<div class="slot slot--empty" data-pos="${pos}">
      <button class="slot__card" type="button" aria-label="Add a ${pos} — show ${pos} players">
        <span class="slot__plus">+</span><span class="slot__pos label">${pos}</span>
      </button></div>`;
  }
  function filledSlot(p) {
    // The remove "×" only exists while the squad is editable — building a new
    // squad, or in transfer mode. A saved squad in view mode is read-only.
    const editable = State.mode === "build" || State.mode === "transfer";
    const removeBtn = editable
      ? `<button class="slot__remove" type="button" aria-label="Remove ${p.name}">&times;</button>`
      : "";
    const isNew = p.player_id === State.lastAddedId ? " is-new" : "";
    return `<div class="slot slot--filled${isNew}" data-pos="${p.position}" data-pid="${p.player_id}">
      <div class="slot__card">
        ${removeBtn}
        ${faceHtml(p)}
        <span class="slot__name">${p.name}</span>
        <span class="slot__meta">${flagImg(p.team_id)}<span class="slot__price">$${p.base_price.toFixed(1)}m</span></span>
      </div></div>`;
  }

  /* ------------------------------------------------------------- top bar --- */
  function renderSummary() {
    const n = State.currentSquad.players.length;
    const used = State.budgetUsed();
    const rem = State.budgetRemaining();

    document.getElementById("statSelected").textContent = `${n}/11`;
    document.getElementById("statUsed").textContent = `$${used.toFixed(1)}m`;
    const remEl = document.getElementById("statRemaining");
    remEl.textContent = `$${rem.toFixed(1)}m`;
    remEl.classList.toggle("is-over", used > RULES.budgetCap);

    const meter = document.getElementById("budgetMeter");
    meter.style.width = Math.min(100, (used / RULES.budgetCap) * 100) + "%";
    meter.classList.toggle("is-over", used > RULES.budgetCap);

    // Action bar + transfers chip are mode-driven:
    //   build    → Save Squad (POST /squad), Cancel changes
    //   view     → Make transfers (squad is read-only)
    //   transfer → Confirm N transfers (POST /transfer ×N), Cancel
    const mode = State.mode;
    const saveBtn = document.getElementById("saveSquadBtn");
    const trBtn = document.getElementById("makeTransfersBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const show = (el, v) => { el.style.display = v ? "" : "none"; };
    const over = used > RULES.budgetCap;

    if (mode === "build") {
      document.getElementById("statTransfers").textContent = "—";
      show(saveBtn, true);
      saveBtn.textContent = "Save Squad";
      saveBtn.disabled = !State.isComplete() || over;
      show(trBtn, false);
      show(cancelBtn, true);
      cancelBtn.textContent = "Cancel changes";
      cancelBtn.disabled = !State.isDirty();
    } else if (mode === "transfer") {
      const pend = State.pendingTransfers();
      const remaining = State.transfersRemaining();
      document.getElementById("statTransfers").textContent = `${Math.max(0, remaining - pend.length)}/5`;
      show(saveBtn, false);
      show(trBtn, true);
      trBtn.textContent = pend.length ? `Confirm ${pend.length} transfer${pend.length === 1 ? "" : "s"}` : "Confirm transfers";
      trBtn.disabled = pend.length === 0 || pend.length > remaining || over || !State.isComplete();
      show(cancelBtn, true);
      cancelBtn.textContent = "Cancel";
      cancelBtn.disabled = false;
    } else { // view
      document.getElementById("statTransfers").textContent = `${State.transfersRemaining()}/5`;
      show(saveBtn, false);
      show(trBtn, true);
      trBtn.textContent = "Make transfers";
      trBtn.disabled = State.transfersRemaining() <= 0;
      show(cancelBtn, false);
    }
    trBtn.classList.toggle("btn--primary", mode === "transfer");
    trBtn.classList.toggle("btn--ghost", mode !== "transfer");

    document.querySelectorAll("#formationSeg .segmented__btn").forEach((b) => {
      b.disabled = mode === "view";
      b.classList.toggle("is-active", b.dataset.formation === State.currentSquad.formation);
    });
  }

  /* ----------------------------------------------------------- PlayerPool --- */
  function renderPool() {
    const list = document.getElementById("poolList");
    const out = [];
    for (const p of State.players) {
      if (filter.position && p.position !== filter.position) continue;
      if (filter.teams.size && !filter.teams.has(p.team_id)) continue;
      if (filter.max_price != null && p.base_price > filter.max_price) continue;
      if (filter.name && !p.name.toLowerCase().includes(filter.name.toLowerCase())) continue;
      out.push(p);
    }

    // sort ("ranked") — client-side; player.py has no ORDER BY and all players
    // are already loaded, so this never hits the network.
    if (filter.sort === "price-desc") out.sort((a, b) => b.base_price - a.base_price);
    else if (filter.sort === "price-asc") out.sort((a, b) => a.base_price - b.base_price);
    else if (filter.sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById("poolCount").textContent = `${out.length} player${out.length === 1 ? "" : "s"}`;

    if (!out.length) { list.innerHTML = `<p class="empty-note">No players match these filters.</p>`; return; }

    const cap = 120;
    const shown = out.slice(0, cap);
    const poolLocked = State.mode === "view";   // saved squad → no adding until transfer mode
    let html = "";
    for (const p of shown) {
      const selected = State.hasPlayer(p.player_id);
      const reason = State.addBlockReason(p);
      const hardDisabled = poolLocked || selected;
      const title = poolLocked ? 'Tap "Make transfers" to change your squad'
        : selected ? "In squad" : reason || "Add to squad";
      const btnClass = "player-row__add" + (hardDisabled ? "" : reason ? " is-blocked" : "");
      html += `<div class="player-row ${selected ? "is-selected" : ""}" data-pos="${p.position}" data-pid="${p.player_id}">
        <span class="player-row__accent"></span>
        <span class="player-row__id">${faceHtml(p, true)}<span>
          <span class="player-row__name">${p.name}</span>
          <span class="player-row__team">${flagImg(p.team_id)} ${p.team_name}</span></span></span>
        <span class="player-row__pos">${p.position}</span>
        <span style="display:flex;align-items:center;gap:var(--sp-3)">
          <span class="player-row__price">$${p.base_price.toFixed(1)}m</span>
          <button class="${btnClass}" type="button" ${hardDisabled ? "disabled" : ""}
            aria-label="Add ${p.name}" title="${title}">+</button>
        </span></div>`;
    }
    if (out.length > cap) html += `<p class="empty-note">Showing ${cap} of ${out.length}. Refine filters to see more.</p>`;
    list.innerHTML = html;

    list.querySelectorAll(".player-row__add").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = +btn.closest(".player-row").dataset.pid;
        const player = State.players.find((p) => p.player_id === pid);
        if (!player) return;
        const reason = State.addBlockReason(player);
        if (reason) { RuleAlert.show(reason); return; }
        State.addPlayer(player);
      });
    });
  }

  /* ------------------------------------------ multi-select team search --- */
  function buildTeamSearch() {
    const listEl = document.getElementById("teamList");
    const chipsEl = document.getElementById("teamChips");
    const searchEl = document.getElementById("teamSearch");

    function renderList() {
      const q = searchEl.value.toLowerCase();
      let html = "";
      for (const t of State.teams) {
        if (q && !t.name.toLowerCase().includes(q)) continue;
        const sel = filter.teams.has(t.team_id);
        html += `<div class="team-opt ${sel ? "is-sel" : ""}" data-team="${t.team_id}" role="button" tabindex="0" aria-pressed="${sel}">
          ${flagImg(t.team_id)}<span class="team-opt__name">${t.name}</span>
          <span class="team-opt__check">&#10003;</span></div>`;
      }
      listEl.innerHTML = html || `<p class="empty-note">No teams match.</p>`;
      listEl.querySelectorAll(".team-opt").forEach((opt) => {
        opt.addEventListener("click", () => toggle(opt.dataset.team));
        opt.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(opt.dataset.team); } });
      });
    }
    function renderChips() {
      if (!filter.teams.size) { chipsEl.hidden = true; chipsEl.innerHTML = ""; return; }
      chipsEl.hidden = false;
      let html = "";
      filter.teams.forEach((id) => {
        const t = State.teams.find((x) => x.team_id === id);
        html += `<span class="team-chip">${t ? t.name : id}<button type="button" data-team="${id}" aria-label="Remove ${t ? t.name : id}">&times;</button></span>`;
      });
      chipsEl.innerHTML = html;
      chipsEl.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => toggle(b.dataset.team)));
    }
    function toggle(id) {
      if (filter.teams.has(id)) filter.teams.delete(id); else filter.teams.add(id);
      renderList(); renderChips(); renderPool();
    }

    // collapsed overlay behavior — open on focus/typing, close on outside-click / Escape
    const root = searchEl.closest(".teamsearch");
    searchEl.addEventListener("focus", () => root.classList.add("is-open"));
    searchEl.addEventListener("input", () => { root.classList.add("is-open"); renderList(); });
    document.addEventListener("click", (e) => { if (!root.contains(e.target)) root.classList.remove("is-open"); });
    searchEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { root.classList.remove("is-open"); searchEl.blur(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const first = listEl.querySelector(".team-opt");
        if (first) { toggle(first.dataset.team); root.classList.remove("is-open"); searchEl.value = ""; renderList(); }
      }
    });

    renderList(); renderChips();
  }

  /* --------------------------------------------------------------- save --- */
  async function saveSquad() {
    const btn = document.getElementById("saveSquadBtn");
    btn.disabled = true;
    try {
      const ids = State.currentSquad.players.map((p) => p.player_id);
      const squad = await Api.createSquad(State.currentMatchday, ids);
      State.squadSaved = true;
      State.transfersUsed = 0;
      State.setBaseline();
      State.setMode("view");   // saved → read-only; further edits go through transfers
      Toast.show(`Squad saved for Round ${squad.matchday}.`, "success");
    } catch (e) {
      Toast.show(e.message || "Could not save squad.", "error");
    } finally { renderSummary(); }
  }

  /* --------------------------------------------------------------- wire --- */
  function init() {
    document.querySelectorAll("#formationSeg .segmented__btn").forEach((b) => {
      b.addEventListener("click", () => State.setFormation(b.dataset.formation));
    });
    document.querySelectorAll("#posChips .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#posChips .chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        filter.position = chip.dataset.pos;
        renderPool();
      });
    });
    const playerSearchEl = document.getElementById("playerSearch");
    playerSearchEl.addEventListener("input", (e) => { filter.name = e.target.value; renderPool(); });
    playerSearchEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); playerSearchEl.blur(); }
    });

    const range = document.getElementById("priceRange");
    const pv = document.getElementById("priceVal");
    range.addEventListener("input", (e) => {
      const v = +e.target.value, max = +e.target.max;
      filter.max_price = v >= max ? null : v;
      pv.textContent = v >= max ? "Any" : `$${v.toFixed(1)}m`;
      renderPool();
    });

    // sort dropdown (price ranking / name) — glass dropdown from ui.js
    const sortItems = [
      { value: "default", label: "Featured" },
      { value: "price-desc", label: "Price · high → low" },
      { value: "price-asc", label: "Price · low → high" },
      { value: "name", label: "Name · A → Z" },
    ];
    Dropdown.create(document.getElementById("sortDropdown"), sortItems, (v) => { filter.sort = v; renderPool(); }, "default");

    document.getElementById("saveSquadBtn").addEventListener("click", saveSquad);
    document.getElementById("cancelBtn").addEventListener("click", () => {
      if (State.mode === "transfer") { Transfers.cancel(); Toast.show("Transfer changes discarded.", "info"); }
      else { State.restoreBaseline(); Toast.show("Changes reverted.", "info"); }
    });
    document.getElementById("makeTransfersBtn").addEventListener("click", () => {
      if (State.mode === "view") Transfers.enter();
      else if (State.mode === "transfer") Transfers.confirm();
    });

    State.subscribe(() => { renderPitch(); renderSummary(); renderPool(); });
  }

  function showSkeleton() {
    const pitch = document.getElementById("pitch");
    const counts = { FWD: 3, MID: 3, DEF: 4, GK: 1 };
    let rows = PITCH_MARKINGS;
    for (const pos of ROW_ORDER) {
      rows += `<div class="pitch__row">`;
      for (let i = 0; i < counts[pos]; i++) {
        rows += `<div class="slot"><div class="slot__card" style="pointer-events:none">
          <div class="skeleton" style="width:52px;height:52px;border-radius:50%;margin:0 auto"></div>
          <div class="skeleton" style="width:64%;height:10px;border-radius:6px;margin:6px auto 0"></div>
        </div></div>`;
      }
      rows += `</div>`;
    }
    pitch.innerHTML = rows;
    const list = document.getElementById("poolList");
    let html = "";
    for (let i = 0; i < 7; i++) html += `<div class="skeleton" style="height:54px;border-radius:var(--r-md);margin-bottom:6px"></div>`;
    list.innerHTML = html;
  }

  return { init, renderPitch, renderSummary, renderPool, buildTeamSearch, showSkeleton };
})();
