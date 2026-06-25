const Squad = (() => {
  const filter = { name: "", position: "", teams: new Set(), max_price: null, sort: "default" };
  const ROW_ORDER = ["FWD", "MID", "DEF", "GK"];

  let introDone = false;
  let previewPlayerId = null;

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

  function hashSeed(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function avatarStyle(player) {
    const seed = hashSeed(`${player.name}-${player.team_id}-${player.player_id}`);
    const hueA = seed % 360;
    const hueB = (seed * 1.7 + 64) % 360;
    const ring = player.position === "FWD" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)";
    return `style="--avatar-a:hsl(${hueA} 70% 68% / .78);--avatar-b:hsl(${hueB} 72% 58% / .58);--avatar-ring:${ring}"`;
  }

  function faceHtml(player, small) {
    const seed = encodeURIComponent(player.name);
    const src = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50`;
    const size = small ? 34 : 50;
    return `<span class="avatar avatar--${size}" data-pos="${player.position}" style="background-image:url('${src}')"></span>`;
  }

  function previewPlayer() {
    return State.players.find((player) => player.player_id === previewPlayerId) || null;
  }

  function primaryActionNote() {
    if (State.mode === "view") {
      if (!isWindowOpen(State.currentMatchday)) return "Transfers are locked once this matchday opens.";
      if (State.transfersRemaining() <= 0) return "No transfers remain for this matchday.";
      return "Saved squad is read-only until you enter transfer mode.";
    }

    if (State.mode === "transfer") {
      const pending = State.pendingTransfers();
      if (!pending.length) return "Stage at least one swap before confirming.";
      if (pending.length > State.transfersRemaining()) return `Only ${State.transfersRemaining()} transfer${State.transfersRemaining() === 1 ? "" : "s"} remain this matchday.`;
      if (!State.isComplete()) return "Keep the squad complete before confirming transfers.";
      if (State.budgetRemaining() < 0) return "Budget must be back under the limit before confirmation.";
      return "Transfers confirm one by one against the backend.";
    }

    if (!State.isComplete()) return "Fill the remaining slots before saving.";
    if (State.budgetRemaining() < 0) return "Budget must be under $50.0m before saving.";
    return "Backend validation still runs when you save.";
  }

  function renderPitch() {
    const pitch = document.getElementById("pitch");
    if (introDone) pitch.classList.remove("pitch--intro");
    else pitch.classList.add("pitch--intro");

    const need = FORMATIONS[State.currentSquad.formation];
    const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const player of State.currentSquad.players) {
      byPos[player.position].push(player);
    }

    const captain = State.currentSquad.players.slice()
      .sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0))[0];

    const preview = previewPlayer();
    const canTarget = preview && State.mode !== "view" && State.addBlockReason(preview) === null;

    const showEmptyPulse = State.mode === "build" && State.currentSquad.players.length === 0;

    let rows = "";
    for (const pos of ROW_ORDER) {
      const slots = Math.max(need[pos], byPos[pos].length);
      let row = `<div class="pitch-line">`;
      for (let i = 0; i < slots; i++) {
        const player = byPos[pos][i];
        if (player) row += filledSlot(player, captain && player.player_id === captain.player_id);
        else row += emptySlot(pos, canTarget && preview.position === pos, showEmptyPulse);
      }
      row += `</div>`;
      rows += row;
    }

    pitch.innerHTML = PITCH_MARKINGS + rows;

    let tokenIdx = 0;
    pitch.querySelectorAll(".player-token").forEach((token) => {
      token.style.setProperty("--i", tokenIdx);
      tokenIdx = tokenIdx + 1;
    });

    introDone = true;
    State.lastAddedId = null;

    pitch.querySelectorAll(".player-token__remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pid = +btn.closest(".player-token").dataset.pid;
        const removedPlayer = State.currentSquad.players.find((p) => p.player_id === pid);
        State.removePlayer(pid);
        if (State.mode === "transfer" && removedPlayer) {
          Toast.show(`Removed ${removedPlayer.name}.`, "info", 5000);
          const toasts = document.querySelectorAll("#toastRegion .toast");
          const toast = toasts[toasts.length - 1];
          if (toast) {
            const msgSpan = toast.querySelector("span");
            if (msgSpan) {
              const undoBtn = document.createElement("button");
              undoBtn.className = "btn btn--ghost btn--sm";
              undoBtn.textContent = "Undo";
              undoBtn.style.marginLeft = "8px";
              undoBtn.addEventListener("click", () => {
                if (State.canAdd(removedPlayer)) {
                  State.addPlayer(removedPlayer);
                  toast.querySelector(".toast__close")?.click();
                }
              });
              msgSpan.appendChild(undoBtn);
            }
          }
        }
      });
    });

    pitch.querySelectorAll(".player-token--empty").forEach((btn) => {
      btn.addEventListener("click", () => filterByPosition(btn.dataset.pos));
    });
  }

  function filterByPosition(pos) {
    previewPlayerId = null;
    filter.position = pos;
    document.querySelectorAll("#posChips .chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.pos === pos);
    });
    const playersTab = document.querySelector('#poolToggle [data-pane="players"]');
    if (playersTab && !playersTab.classList.contains("is-active")) playersTab.click();
    if (window.innerWidth <= 760) setTeamPane("players");
    renderPool();
    renderPitch();
  }

  function emptySlot(pos, target, pulse) {
    return `<button class="player-token player-token--empty${target ? " player-token--target" : ""}${pulse ? " is-pulse" : ""}" type="button" data-pos="${pos}" aria-label="Add a ${pos}">
      <span class="player-token__plus">+</span>
      <span class="player-token__pos">Add ${pos}</span>
    </button>`;
  }

  function filledSlot(player, isCaptain) {
    const editable = State.mode === "build" || State.mode === "transfer";
    const removeBtn = editable
      ? `<button class="player-token__remove" type="button" aria-label="Remove ${player.name}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>`
      : "";
    const isNew = player.player_id === State.lastAddedId ? " is-new" : "";
    const capBadge = isCaptain ? `<span class="player-token__cap">C</span>` : "";
    return `<div class="player-token${isNew}" data-pos="${player.position}" data-pid="${player.player_id}" role="button" tabindex="0">
      ${removeBtn}
      <span class="player-token__photo">
        ${faceHtml(player)}
        ${flagImg(player.team_id, "avatar__flag")}
        ${capBadge}
      </span>
      <span class="player-token__name">${player.name}</span>
      <span class="player-token__pts">$${Number(player.base_price).toFixed(1)}m</span>
    </div>`;
  }

  function renderSummary() {
    const selected = State.currentSquad.players.length;
    const used = State.budgetUsed();
    const remaining = State.budgetRemaining();
    const pending = State.pendingTransfers();
    const captain = State.currentSquad.players.slice().sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0))[0];

    document.getElementById("statSelected").textContent = `${selected}/11`;
    document.getElementById("statFormation").textContent = State.currentSquad.formation;
    document.getElementById("statUsed").textContent = `$${used.toFixed(1)}m`;
    document.getElementById("statRemaining").textContent = `$${remaining.toFixed(1)}m`;
    document.getElementById("statRemaining").classList.toggle("is-over", remaining < 0);
    document.getElementById("budgetTrackValue").textContent = `${Math.max(0, Math.round((used / RULES.budgetCap) * 100))}%`;
    document.getElementById("budgetMeter").style.width = `${Math.min(100, Math.max(0, (used / RULES.budgetCap) * 100))}%`;
    const meter = document.getElementById("budgetMeter");
    meter.classList.toggle("is-over", used > RULES.budgetCap);
    meter.classList.toggle("is-warning", used / RULES.budgetCap >= 0.8 && used <= RULES.budgetCap);
    const pitchLabel = document.getElementById("pitchLabel");
    if (pitchLabel) {
      const meta = currentRoundMeta(State.currentMatchday);
      const roundLabel = meta ? meta.label : `Round ${State.currentMatchday}`;
      if (State.mode === "build" && State.currentSquad.players.length === 0) {
        pitchLabel.textContent = `YOUR XI \u2014 Tap a position to start`;
      } else {
        pitchLabel.textContent = `YOUR XI \u2014 ${roundLabel} (${State.currentSquad.formation})`;
      }
    }
    const captainLabel = document.getElementById("captainLabel");
    if (captainLabel) captainLabel.textContent = captain ? captain.name : "Auto pick";
    const captainAvatar = document.getElementById("captainAvatar");
    if (captainAvatar) {
      if (captain) {
        const seed = encodeURIComponent(captain.name);
        captainAvatar.style.backgroundImage = `url('https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50')`;
      } else {
        captainAvatar.style.backgroundImage = "";
      }
    }

    // modeLabel (stepper center) is set by updateShellSummary() in app.js to the matchday label
    const windowOpen = isWindowOpen(State.currentMatchday);
    const badge = document.getElementById("modeBadge");
    if (badge) {
      badge.textContent = windowOpen ? "Window open" : "Window locked";
      badge.className = windowOpen ? "status-chip status-chip--open" : "status-chip status-chip--locked";
    }

    const transfersLabel = State.mode === "transfer"
      ? `${Math.max(0, State.transfersRemaining() - pending.length)}/5`
      : State.squadSaved ? `${State.transfersRemaining()}/5` : "-";
    document.getElementById("statTransfers").textContent = transfersLabel;

    const noteEl = document.getElementById("primaryActionNote");
    if (noteEl) noteEl.textContent = primaryActionNote();

    const formationButtons = document.querySelectorAll("#formationSwitch .formation-switch__btn");
    formationButtons.forEach((btn) => {
      const active = btn.dataset.formation === State.currentSquad.formation;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
    });

    const saveBtn = document.getElementById("saveSquadBtn");
    const transferBtn = document.getElementById("makeTransfersBtn");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (State.mode === "build") {
      saveBtn.hidden = false;
      cancelBtn.hidden = !State.isDirty();
      transferBtn.hidden = true;
      confirmBtn.hidden = true;
      saveBtn.disabled = !State.isComplete() || used > RULES.budgetCap;
      cancelBtn.textContent = "Cancel";
      cancelBtn.disabled = !State.isDirty();
    } else if (State.mode === "transfer") {
      confirmBtn.hidden = false;
      cancelBtn.hidden = false;
      saveBtn.hidden = true;
      transferBtn.hidden = true;
      confirmBtn.textContent = pending.length ? `Confirm (${pending.length})` : "Confirm";
      confirmBtn.disabled = pending.length === 0 || pending.length > State.transfersRemaining() || used > RULES.budgetCap || !State.isComplete();
      cancelBtn.textContent = "Cancel";
      cancelBtn.disabled = false;
    } else {
      transferBtn.hidden = false;
      saveBtn.hidden = true;
      confirmBtn.hidden = true;
      cancelBtn.hidden = true;
      transferBtn.disabled = !isWindowOpen(State.currentMatchday) || State.transfersRemaining() <= 0;
    }
  }

  const BADGE_MAP = {
    "Already in squad": { cls: "pool-badge--in", text: "\u2713 In squad" },
    "Over budget": { cls: "pool-badge--over", text: "Over $50m" },
    "Squad full (11)": { cls: "pool-badge--full", text: "Squad full" },
    "Max 3 from one team": { cls: "pool-badge--max", text: "Max 3" },
  };

  function badgeForReason(reason) {
    if (!reason) return null;
    if (BADGE_MAP[reason]) return BADGE_MAP[reason];
    if (reason.startsWith("No ") && reason.endsWith(" slot left")) return { cls: "pool-badge--slot", text: "Slot full" };
    return { cls: "pool-badge--block", text: reason };
  }

  let _visibleCount = 120;

  function renderPool() {
    const list = document.getElementById("poolList");
    const output = [];

    for (const player of State.players) {
      if (filter.position && player.position !== filter.position) continue;
      if (filter.teams.size && !filter.teams.has(player.team_id)) continue;
      if (filter.max_price != null && player.base_price > filter.max_price) continue;
      if (filter.name && !player.name.toLowerCase().includes(filter.name.toLowerCase())) continue;
      output.push(player);
    }

    if (filter.sort === "price-desc") output.sort((a, b) => b.base_price - a.base_price);
    else if (filter.sort === "price-asc") output.sort((a, b) => a.base_price - b.base_price);
    else if (filter.sort === "name") output.sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById("poolCount").textContent = `${output.length} player${output.length === 1 ? "" : "s"}`;

    if (!output.length) {
      list.innerHTML = `<p class="empty-note">No players match these filters.</p>`;
      const moreEl = document.getElementById("poolMore");
      if (moreEl) moreEl.hidden = true;
      return;
    }

    const poolLocked = State.mode === "view";
    const visible = output.slice(0, _visibleCount);
    let html = "";
    for (const player of visible) {
      const selected = State.hasPlayer(player.player_id);
      const reason = State.addBlockReason(player);
      const preview = previewPlayerId === player.player_id;
      const badge = poolLocked
        ? { cls: "pool-badge--locked", text: "Locked" }
        : selected
          ? BADGE_MAP["Already in squad"]
          : badgeForReason(reason);
      const showAdd = !poolLocked && !selected && !reason;
      const rowCls = `${selected ? "is-selected" : ""} ${preview ? "is-preview" : ""}`;
      const ariaLabel = poolLocked
        ? `${player.name} — locked, tap Make Transfers to edit`
        : selected
          ? `${player.name} — already in squad`
          : reason
            ? `${player.name} — ${reason}`
            : `${player.name} — add to squad`;

      html += `<div class="pool-row ${rowCls}" data-pos="${player.position}" data-pid="${player.player_id}" role="button" tabindex="0" aria-label="${ariaLabel}">
        <span class="pool-row__photo">
          ${faceHtml(player, true)}
          ${flagImg(player.team_id, "avatar__flag avatar__flag--sm")}
        </span>
        <span class="pool-row__id">
          <b>${player.name}</b>
          <small><i class="pos pos--${player.position.toLowerCase()}">${player.position}</i> \u00b7 ${player.team_name}</small>
        </span>
        <span class="pool-row__num">
          <b>$${Number(player.base_price).toFixed(1)}m</b>
        </span>
        ${showAdd
          ? `<button class="add-btn" type="button" aria-label="Add ${player.name}" data-action="add"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></button>`
          : badge
            ? `<span class="pool-badge ${badge.cls}">${badge.text}</span>`
            : ""
        }
      </div>`;
    }

    list.innerHTML = html;

    list.querySelectorAll(".pool-row").forEach((row, i) => {
      row.style.setProperty("--i", i);
    });

    const moreEl = document.getElementById("poolMore");
    const moreText = document.getElementById("poolMoreText");
    if (moreEl && moreText) {
      if (output.length > _visibleCount) {
        moreEl.hidden = false;
        moreText.textContent = `Showing ${visible.length} of ${output.length}`;
      } else {
        moreEl.hidden = true;
      }
    }

    list.querySelectorAll(".pool-row").forEach((row) => {
      const activate = () => {
        const pid = +row.dataset.pid;
        const player = State.players.find((item) => item.player_id === pid);
        if (!player) return;

        if (State.mode === "view") {
          Toast.show('Tap "Make Transfers" to edit this squad.', "info");
          return;
        }

        const reason = State.addBlockReason(player);
        if (reason) {
          RuleAlert.show(reason);
          previewPlayerId = pid;
          renderPool();
          renderPitch();
          return;
        }

        State.addPlayer(player);
        previewPlayerId = null;
      };
      row.addEventListener("click", activate);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  function buildTeamSearch() {
    const listEl = document.getElementById("teamList");
    const chipsEl = document.getElementById("teamChips");
    const searchEl = document.getElementById("teamSearch");
    if (!listEl || !searchEl) return;

    function renderList() {
      const query = searchEl.value.toLowerCase();
      let html = "";
      for (const team of State.teams) {
        if (query && !team.name.toLowerCase().includes(query)) continue;
        const selected = filter.teams.has(team.team_id);
        html += `<div class="team-opt ${selected ? "is-sel" : ""}" data-team="${team.team_id}" role="button" tabindex="0" aria-pressed="${selected}">
          ${flagImg(team.team_id)}
          <span class="team-opt__name">${team.name}</span>
          <span class="team-opt__check">&#10003;</span>
        </div>`;
      }
      listEl.innerHTML = html || `<p class="empty-note">No teams match.</p>`;
      listEl.querySelectorAll(".team-opt").forEach((opt) => {
        opt.addEventListener("click", () => toggle(opt.dataset.team));
        opt.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(opt.dataset.team);
          }
        });
      });
    }

    function renderChips() {
      if (!filter.teams.size) {
        chipsEl.hidden = true;
        chipsEl.innerHTML = "";
        return;
      }
      chipsEl.hidden = false;
      let html = "";
      filter.teams.forEach((teamId) => {
        const team = State.teams.find((item) => item.team_id === teamId);
        html += `<span class="team-chip">${team ? team.name : teamId}<button type="button" data-team="${teamId}" aria-label="Remove ${team ? team.name : teamId}">&times;</button></span>`;
      });
      chipsEl.innerHTML = html;
      chipsEl.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => toggle(btn.dataset.team));
      });
    }

    function toggle(teamId) {
      if (filter.teams.has(teamId)) filter.teams.delete(teamId);
      else filter.teams.add(teamId);
      renderList();
      renderChips();
      renderPool();
    }

    const root = searchEl.closest(".teamsearch");
    searchEl.addEventListener("focus", () => root.classList.add("is-open"));
    searchEl.addEventListener("input", () => {
      root.classList.add("is-open");
      renderList();
    });
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) root.classList.remove("is-open");
    });
    searchEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        root.classList.remove("is-open");
        searchEl.blur();
      }
    });

    renderList();
    renderChips();
  }

  async function saveSquad() {
    const btn = document.getElementById("saveSquadBtn");
    btn.disabled = true;
    try {
      const ids = State.currentSquad.players.map((player) => player.player_id);
      const squad = await Api.createSquad(State.currentMatchday, ids);
      State.squadSaved = true;
      State.transfersUsed = 0;
      State.setBaseline();
      State.setMode("view");
      Toast.show(`Squad saved for Round ${squad.matchday}.`, "success");
    } catch (e) {
      Toast.show(e.message || "Could not save squad.", "error");
    } finally {
      renderSummary();
    }
  }

  function init() {
    document.querySelectorAll("#posChips .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#posChips .chip").forEach((btn) => btn.classList.remove("is-active"));
        chip.classList.add("is-active");
        filter.position = chip.dataset.pos;
        previewPlayerId = null;
        _visibleCount = 120;
        renderPool();
        renderPitch();
      });
    });

    const playerSearch = document.getElementById("playerSearch");
    if (playerSearch) {
      playerSearch.addEventListener("input", (e) => {
        filter.name = e.target.value;
        _visibleCount = 120;
        renderPool();
      });
    }

    const range = document.getElementById("priceRange");
    const priceVal = document.getElementById("priceVal");
    if (range) {
      range.addEventListener("input", (e) => {
        const value = +e.target.value;
        const max = +e.target.max;
        filter.max_price = value >= max ? null : value;
        if (priceVal) priceVal.textContent = value >= max ? "Any" : `$${value.toFixed(1)}m`;
        _visibleCount = 120;
        renderPool();
      });
    }

    const sortItems = [
      { value: "default", label: "Default" },
      { value: "price-desc", label: "Price - high to low" },
      { value: "price-asc", label: "Price - low to high" },
      { value: "name", label: "Name - A to Z" },
    ];
    const sortDropdownEl = document.getElementById("sortDropdown");
    if (sortDropdownEl) {
      Dropdown.create(sortDropdownEl, sortItems, (value) => {
        filter.sort = value;
        _visibleCount = 120;
        renderPool();
      }, "default");
    }

    document.querySelectorAll("#formationSwitch .formation-switch__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        State.setFormation(btn.dataset.formation);
      });
    });

    document.getElementById("saveSquadBtn").addEventListener("click", saveSquad);
    document.getElementById("cancelBtn").addEventListener("click", () => {
      previewPlayerId = null;
      if (State.mode === "transfer") {
        Transfers.cancel();
        Toast.show("Transfer changes discarded.", "info");
      } else {
        State.restoreBaseline();
        Toast.show("Changes reverted.", "info");
      }
    });
    document.getElementById("makeTransfersBtn").addEventListener("click", () => {
      if (State.mode === "view") Transfers.enter();
    });
    document.getElementById("confirmBtn").addEventListener("click", () => {
      if (State.mode === "transfer") Transfers.confirm();
    });

    const poolMoreBtn = document.getElementById("poolMoreBtn");
    if (poolMoreBtn) {
      poolMoreBtn.addEventListener("click", () => {
        _visibleCount += 120;
        renderPool();
      });
    }

    State.subscribe(() => {
      renderPitch();
      renderSummary();
      renderPool();
      renderProgressChecklist();
      renderTipBanner();
    });
  }

  function showSkeleton() {
    const pitch = document.getElementById("pitch");
    const counts = { FWD: 3, MID: 3, DEF: 4, GK: 1 };
    let rows = PITCH_MARKINGS;
    for (const pos of ROW_ORDER) {
      rows += `<div class="pitch-line">`;
      for (let i = 0; i < counts[pos]; i++) {
        rows += `<button class="player-token" style="pointer-events:none">
          <span class="player-token__photo"><div class="skeleton" style="width:50px;height:50px;border-radius:50%"></div></span>
          <span class="player-token__name"><div class="skeleton" style="width:64%;height:12px;border-radius:4px"></div></span>
          <span class="player-token__pts"><div class="skeleton" style="width:42%;height:10px;border-radius:4px"></div></span>
        </button>`;
      }
      rows += `</div>`;
    }
    pitch.innerHTML = rows;

    const list = document.getElementById("poolList");
    let html = "";
    for (let i = 0; i < 7; i++) {
      html += `<div class="skeleton" style="height:56px;margin-bottom:8px"></div>`;
    }
    list.innerHTML = html;
  }

  function renderProgressChecklist() {
    const el = document.getElementById("buildProgress");
    if (!el) return;

    const showInBuild = State.mode === "build" && !State.isComplete();
    const showInTransfer = State.mode === "transfer";
    const shouldShow = showInBuild || showInTransfer;

    if (!shouldShow) {
      el.hidden = true;
      return;
    }

    el.hidden = false;

    const need = FORMATIONS[State.currentSquad.formation];
    const counts = State.posCounts();
    const used = State.budgetUsed();
    const budgetPct = used / RULES.budgetCap;

    let html = "";

    for (const pos of POSITIONS) {
      const filled = counts[pos];
      const required = need[pos];
      const isDone = filled === required;
      html += `<span class="build-progress__item${isDone ? " is-done" : ""}">
        <span class="build-progress__check">\u2713</span>
        ${pos} ${filled}/${required}
      </span>`;
    }

    const budgetCls = budgetPct > 1 ? " is-over" : budgetPct >= 0.8 ? " is-warning" : " is-done";
    const budgetLabel = budgetPct > 1 ? "Over budget" : `$${used.toFixed(1)}m / $${RULES.budgetCap}m`;
    html += `<span class="build-progress__item${budgetCls}">
      <span class="build-progress__check">\u2713</span>
      ${budgetLabel}
    </span>`;

    if (showInTransfer) {
      const remaining = State.transfersRemaining();
      const pending = State.pendingTransfers().length;
      const transfersLeft = Math.max(0, remaining - pending);
      html += `<span class="build-progress__item">
        <span class="build-progress__check">\u2713</span>
        ${transfersLeft}/5 transfers left
      </span>`;
    }

    el.innerHTML = html;
  }

  function renderTipBanner() {
    const el = document.getElementById("tipBanner");
    if (!el) return;

    if (sessionStorage.getItem("gaffer_tip_dismissed")) {
      el.hidden = true;
      return;
    }

    const mode = State.mode;
    const count = State.currentSquad.players.length;
    const used = State.budgetUsed();
    const pending = State.pendingTransfers();

    let msg = null;

    if (mode === "build") {
      if (count === 0) {
        msg = "Welcome! Tap an empty position on the pitch to filter the player pool and start building.";
      } else if (count < 11) {
        msg = `Good progress \u2014 ${count}/11 players selected. Keep going!`;
      } else if (used > RULES.budgetCap) {
        msg = "You're over budget. Remove a player or swap for a cheaper one.";
      } else if (!State.squadSaved) {
        msg = "Your squad is ready! Hit Save to lock it in.";
      } else {
        el.hidden = true;
        return;
      }
    } else if (mode === "transfer") {
      if (used > RULES.budgetCap) {
        msg = "Budget must be under $50m before confirming.";
      } else if (pending.length === 0) {
        msg = "Remove a player from the pitch, then add a replacement from the pool.";
      } else {
        msg = `${pending.length} swap${pending.length === 1 ? "" : "s"} staged. Hit Confirm when ready.`;
      }
    } else {
      el.hidden = true;
      return;
    }

    el.hidden = false;
    el.innerHTML = `<span class="tip-banner__text">${msg}</span>
      <button class="tip-banner__close" type="button" aria-label="Dismiss tip">\u00d7</button>`;

    const closeBtn = el.querySelector(".tip-banner__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        sessionStorage.setItem("gaffer_tip_dismissed", "1");
        el.hidden = true;
      });
    }
  }

  return {
    init,
    renderPitch,
    renderSummary,
    renderPool,
    renderProgressChecklist,
    renderTipBanner,
    buildTeamSearch,
    showSkeleton,
  };
})();
