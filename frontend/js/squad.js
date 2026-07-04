const Squad = (() => {
  const filter = { name: "", position: "", teams: new Set(), min_price: null, max_price: null, sort: "default" };
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
    const seed = encodeURIComponent(player.name).replace(/'/g, "%27");
    const src = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50`;
    const size = small ? 34 : 56;
    return `<span class="avatar avatar--${size}" data-pos="${player.position}" style="background-image:url('${src}')"></span>`;
  }

  function previewPlayer() {
    return State.players.find((player) => player.player_id === previewPlayerId) || null;
  }

  function primaryActionNote() {
    if (State.mode === "view") {
      if (!isTransferAllowed(State.currentMatchday)) return t("squad.transfers_current_next");
      if (!isWindowOpen(State.currentMatchday)) return t("squad.transfers_locked_md");
      if (State.transfersRemaining() <= 0) return t("squad.no_transfers_remain");
      return t("squad.read_only");
    }

    if (State.mode === "transfer") {
      const pending = State.pendingTransfers();
      if (!pending.length) return t("squad.stage_swap");
      if (pending.length > State.transfersRemaining()) return t("squad.only_n_remain", State.transfersRemaining());
      if (!State.isComplete()) return t("squad.keep_complete");
      if (State.budgetRemaining() < 0) return t("squad.budget_under_limit");
      return t("squad.confirm_one_by_one");
    }

    if (!State.isComplete()) return t("squad.fill_slots");
    if (!State.currentSquad.captainId) return t("squad.select_captain");
    if (State.budgetRemaining() < 0) return t("squad.budget_under_50");
    return t("squad.backend_validation");
  }

  const ROW_TOPS = { FWD: 40, MID: 200, DEF: 365, GK: 535 };
  const X_POSITIONS = {
    1: [50],
    2: [35, 65],
    3: [22, 50, 78],
    4: [13, 37, 63, 87],
  };

  function slotStyle(top, leftPct) {
    return `top:${top}px;left:${leftPct}%;transform:translateX(-50%)`;
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

    const captain = State.getCaptain();

    const preview = previewPlayer();
    const canTarget = preview && State.mode !== "view" && State.addBlockReason(preview) === null;

    const showEmptyPulse = State.mode === "build" && State.currentSquad.players.length === 0;

    let html = PITCH_MARKINGS;
    for (const pos of ROW_ORDER) {
      const slots = Math.max(need[pos], byPos[pos].length);
      const top = ROW_TOPS[pos];
      const xs = X_POSITIONS[slots] || X_POSITIONS[4];
      for (let i = 0; i < slots; i++) {
        const player = byPos[pos][i];
        const style = slotStyle(top, xs[i]);
        if (player) html += filledSlot(player, captain && player.player_id === captain.player_id, style);
        else html += emptySlot(pos, canTarget && preview.position === pos, showEmptyPulse, style);
      }
    }

    pitch.innerHTML = html;

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
          Toast.show(t("toast.removed_player", removedPlayer.name), "info", 5000);
          const toasts = document.querySelectorAll("#toastRegion .toast");
          const toast = toasts[toasts.length - 1];
          if (toast) {
            const msgSpan = toast.querySelector("span");
            if (msgSpan) {
              const undoBtn = document.createElement("button");
              undoBtn.className = "btn btn--ghost btn--sm";
              undoBtn.textContent = t("squad.undo");
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

    pitch.querySelectorAll(".player-token:not(.player-token--empty)").forEach((token) => {
      token.addEventListener("click", (e) => {
        if (e.target.closest(".player-token__remove")) return;
        const pid = +token.dataset.pid;
        showCaptainPopover(token, pid);
      });
    });
  }

  let _activePopover = null;

  function closeCaptainPopover() {
    if (_activePopover) {
      _activePopover.remove();
      _activePopover = null;
    }
  }

  function showCaptainPopover(token, pid) {
    closeCaptainPopover();
    const player = State.currentSquad.players.find((p) => p.player_id === pid);
    if (!player) return;
    const isCap = State.currentSquad.captainId === pid;
    const popover = document.createElement("div");
    popover.className = "captain-popover";
    popover.style.position = "fixed";
    popover.style.zIndex = "99999";
    popover.innerHTML = `
      <div class="captain-popover__header">${player.name}</div>
      <button class="captain-popover__btn" type="button">${isCap ? t("squad.remove_captain") : t("squad.make_captain")}</button>
    `;
    document.body.appendChild(popover);

    const rect = token.getBoundingClientRect();
    const popW = popover.offsetWidth;
    const popH = popover.offsetHeight;
    let left = rect.right + 6;
    let top = rect.top;

    if (left + popW > window.innerWidth - 8) left = rect.left - popW - 6;
    if (top + popH > window.innerHeight - 8) top = window.innerHeight - popH - 8;
    if (top < 8) top = 8;
    if (left < 8) left = 8;

    popover.style.top = top + "px";
    popover.style.left = left + "px";
    _activePopover = popover;

    popover.querySelector(".captain-popover__btn").addEventListener("click", () => {
      if (isCap) {
        State.setCaptain(null);
        Toast.show(t("toast.captain_removed", player.name), "info");
      } else {
        State.setCaptain(pid);
        Toast.show(t("toast.captain_set", player.name), "success");
      }
      closeCaptainPopover();
      renderPitch();
      renderSummary();
    });

    setTimeout(() => {
      document.addEventListener("click", _popoverOutsideClick);
    }, 0);
  }

  function _popoverOutsideClick(e) {
    if (_activePopover && !_activePopover.contains(e.target) && !e.target.closest(".player-token")) {
      closeCaptainPopover();
      document.removeEventListener("click", _popoverOutsideClick);
    }
  }

  function filterByPosition(pos) {
    previewPlayerId = null;
    filter.position = pos;
    document.querySelectorAll("#posChips .chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.pos === pos);
    });
    if (window.innerWidth <= 760) setTeamPane("players");
    renderPool();
    renderPitch();
  }

  function emptySlot(pos, target, pulse, style) {
    return `<button class="player-token player-token--empty${target ? " player-token--target" : ""}${pulse ? " is-pulse" : ""}" type="button" data-pos="${pos}" style="${style}" aria-label="${t("pitch.add_a", pos)}">
      <span class="player-token__plus">+</span>
      <span class="player-token__pos">${t("squad.add_position", pos)}</span>
    </button>`;
  }

  function filledSlot(player, isCaptain, style) {
    const editable = State.mode === "build" || State.mode === "transfer";
    const removeBtn = editable
      ? `<button class="player-token__remove" type="button" aria-label="${t("pitch.remove", player.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="10" height="10"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>`
      : "";
    const isNew = player.player_id === State.lastAddedId ? " is-new" : "";
    const capBadge = isCaptain ? `<span class="player-token__cap">C</span>` : "";
    return `<div class="player-token${isNew}" data-pos="${player.position}" data-pid="${player.player_id}" role="button" tabindex="0" style="${style}">
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
    const captain = State.getCaptain();

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
      const roundLabel = meta ? meta.label : t("stage.group_stage", State.currentMatchday);
      if (State.mode === "build" && State.currentSquad.players.length === 0) {
        pitchLabel.textContent = t("pitch.tap_to_start");
      } else {
        pitchLabel.textContent = t("pitch.your_xi_round", roundLabel, State.currentSquad.formation);
      }
    }
    const captainLabel = document.getElementById("captainLabel");
    if (captainLabel) captainLabel.textContent = captain ? captain.name : t("captain.not_selected");
    const captainAvatar = document.getElementById("captainAvatar");
    if (captainAvatar) {
      if (captain) {
        const seed = encodeURIComponent(captain.name).replace(/'/g, "%27");
        captainAvatar.style.backgroundImage = `url('https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50')`;
      } else {
        captainAvatar.style.backgroundImage = "";
      }
    }

    // modeLabel (stepper center) is set by updateShellSummary() in app.js to the matchday label
    const windowOpen = isWindowOpen(State.currentMatchday);
    const badge = document.getElementById("modeBadge");
    if (badge) {
      badge.textContent = windowOpen ? t("window.open") : t("window.locked");
      badge.className = windowOpen ? "status-chip status-chip--open" : "status-chip status-chip--locked";
    }

    const transfersLabel = State.mode === "transfer"
      ? `${Math.max(0, State.transfersRemaining() - pending.length)}/5`
      : State.squadSaved ? `${State.transfersRemaining()}/5` : "-";
    document.getElementById("statTransfers").textContent = transfersLabel;

    const noteEl = document.getElementById("primaryActionNote");
    if (noteEl) noteEl.textContent = primaryActionNote();

    const formationButtons = document.querySelectorAll("#formationSwitch .formation-switch__btn");
    const formationLocked = State.mode === "view";
    formationButtons.forEach((btn) => {
      const active = btn.dataset.formation === State.currentSquad.formation;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
      btn.disabled = formationLocked;
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
      cancelBtn.textContent = t("action.cancel");
      cancelBtn.disabled = !State.isDirty();
    } else if (State.mode === "transfer") {
      confirmBtn.hidden = false;
      cancelBtn.hidden = false;
      saveBtn.hidden = true;
      transferBtn.hidden = true;
      confirmBtn.textContent = pending.length ? t("action.confirm_n", pending.length) : t("action.confirm");
      confirmBtn.disabled = pending.length === 0 || pending.length > State.transfersRemaining() || used > RULES.budgetCap || !State.isComplete();
      cancelBtn.textContent = t("action.cancel");
      cancelBtn.disabled = false;
    } else {
      transferBtn.hidden = false;
      saveBtn.hidden = true;
      confirmBtn.hidden = true;
      cancelBtn.hidden = true;
      transferBtn.disabled = !isTransferAllowed(State.currentMatchday) || !isWindowOpen(State.currentMatchday) || State.transfersRemaining() <= 0;
    }
  }

  const BADGE_MAP = {
    "Already in squad": { cls: "pool-badge--in", text: () => t("badge.in_squad") },
    "Over budget": { cls: "pool-badge--over", text: () => t("badge.over_budget") },
    "Squad full (11)": { cls: "pool-badge--full", text: () => t("badge.squad_full") },
    "Max 3 from one team": { cls: "pool-badge--max", text: () => t("badge.max_3") },
  };

  function badgeForReason(reason) {
    if (!reason) return null;
    if (BADGE_MAP[reason]) return BADGE_MAP[reason];
    if (reason.startsWith("No ") && reason.endsWith(" slot left")) return { cls: "pool-badge--slot", text: () => t("badge.slot_full") };
    return { cls: "pool-badge--block", text: () => reason };
  }

  let _visibleCount = 120;

  function renderPool() {
    const list = document.getElementById("poolList");
    const output = [];

    for (const player of State.players) {
      if (filter.position && player.position !== filter.position) continue;
      if (filter.teams.size && !filter.teams.has(player.team_id)) continue;
      if (filter.min_price != null && player.base_price < filter.min_price) continue;
      if (filter.max_price != null && player.base_price > filter.max_price) continue;
      if (filter.name && !player.name.toLowerCase().includes(filter.name.toLowerCase())) continue;
      output.push(player);
    }

    if (filter.sort === "price-desc") output.sort((a, b) => b.base_price - a.base_price);
    else if (filter.sort === "price-asc") output.sort((a, b) => a.base_price - b.base_price);
    else if (filter.sort === "name") output.sort((a, b) => a.name.localeCompare(b.name));

    var poolCount = output.length;
    document.getElementById("poolCount").textContent = poolCount === 1 ? t("pool.player_count", poolCount) : t("pool.player_count_plural", poolCount);

    if (!output.length) {
      list.innerHTML = `<p class="empty-note">${t("pool.no_match")}</p>`;
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
        ? { cls: "pool-badge--locked", text: () => t("badge.locked") }
        : selected
          ? BADGE_MAP["Already in squad"]
          : badgeForReason(reason);
      const showAdd = !poolLocked && !selected && !reason;
      const rowCls = `${selected ? "is-selected" : ""} ${preview ? "is-preview" : ""}`;
      const ariaLabel = poolLocked
        ? t("squad.aria_locked", player.name)
        : selected
          ? t("squad.aria_in_squad", player.name)
          : reason
            ? t("squad.aria_blocked", player.name, reason)
            : t("squad.aria_add", player.name);

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
          ? `<button class="add-btn" type="button" aria-label="${t("squad.aria_add_btn", player.name)}" data-action="add"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></button>`
          : badge
            ? `<span class="pool-badge ${badge.cls}">${badge.text()}</span>`
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
        moreText.textContent = t("pool.showing", visible.length, output.length);
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
          Toast.show(t("squad.tap_make_transfers"), "info");
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
      listEl.innerHTML = html || `<p class="empty-note">${t("pool.no_teams")}</p>`;
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
      if (e.key === "Enter") {
        e.preventDefault();
        const first = listEl.querySelector(".team-opt");
        if (first) toggle(first.dataset.team);
      }
    });

    renderList();
    renderChips();
  }

  async function saveSquad() {
    if (!State.currentSquad.captainId) {
      Toast.show(t("squad.select_captain"), "info");
      return;
    }
    const btn = document.getElementById("saveSquadBtn");
    btn.disabled = true;
    Progress.start();
    try {
      const ids = State.currentSquad.players.map((player) => player.player_id);
      const squad = await Api.createSquad(State.currentMatchday, ids, State.currentSquad.captainId);
      State.squadSaved = true;
      State.transfersUsed = 0;
      State.setBaseline();
      State.setMode("view");
      Toast.show(t("toast.squad_saved", squad.matchday), "success");
    } catch (e) {
      Toast.show(e.message || t("toast.could_not_save"), "error");
    } finally {
      Progress.done();
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
      playerSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const first = document.querySelector("#poolList .pool-row");
          if (first) {
            const pid = +first.dataset.pid;
            const player = State.players.find((item) => item.player_id === pid);
            if (!player) return;
            if (State.mode === "view") {
              Toast.show(t("squad.tap_make_transfers"), "info");
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
          }
        }
      });
    }

    const rangeMin = document.getElementById("priceRangeMin");
    const rangeMax = document.getElementById("priceRangeMax");
    const priceValMin = document.getElementById("priceValMin");
    const priceValMax = document.getElementById("priceValMax");
    const priceFill = document.getElementById("priceFill");

    function updatePriceFill() {
      if (!rangeMin || !rangeMax || !priceFill) return;
      var min = +rangeMin.value;
      var max = +rangeMax.value;
      var lo = +rangeMin.min;
      var hi = +rangeMin.max;
      var span = hi - lo;
      if (span <= 0) return;
      var leftPct = ((min - lo) / span) * 100;
      var rightPct = ((max - lo) / span) * 100;
      priceFill.style.left = leftPct + "%";
      priceFill.style.width = (rightPct - leftPct) + "%";
    }

    function onPriceChange() {
      var minVal = +rangeMin.value;
      var maxVal = +rangeMax.value;
      if (minVal > maxVal) {
        if (document.activeElement === rangeMin) {
          rangeMax.value = minVal;
          maxVal = minVal;
        } else {
          rangeMin.value = maxVal;
          minVal = maxVal;
        }
      }
      var max = +rangeMin.max;
      filter.min_price = minVal <= 0 ? null : minVal;
      filter.max_price = maxVal >= max ? null : maxVal;
      if (priceValMin) priceValMin.textContent = minVal <= 0 ? t("pool.any") : "$" + minVal.toFixed(1) + "m";
      if (priceValMax) priceValMax.textContent = maxVal >= max ? t("pool.any") : "$" + maxVal.toFixed(1) + "m";
      updatePriceFill();
      _visibleCount = 120;
      renderPool();
    }

    if (rangeMin) rangeMin.addEventListener("input", onPriceChange);
    if (rangeMax) rangeMax.addEventListener("input", onPriceChange);
    updatePriceFill();

    const sortItems = [
      { value: "default", label: () => t("sort.default") },
      { value: "price-desc", label: () => t("sort.price_desc") },
      { value: "price-asc", label: () => t("sort.price_asc") },
      { value: "name", label: () => t("sort.name") },
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
        Toast.show(t("toast.transfers_discarded"), "info");
      } else {
        State.restoreBaseline();
        Toast.show(t("toast.changes_reverted"), "info");
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
    let html = PITCH_MARKINGS;
    for (const pos of ROW_ORDER) {
      const slots = counts[pos];
      const top = ROW_TOPS[pos];
      const xs = X_POSITIONS[slots] || X_POSITIONS[4];
      for (let i = 0; i < slots; i++) {
        const style = slotStyle(top, xs[i]);
        html += `<button class="player-token" style="${style};pointer-events:none">
          <span class="player-token__photo"><div class="skeleton" style="width:56px;height:56px;border-radius:50%"></div></span>
          <span class="player-token__name"><div class="skeleton" style="width:64%;height:12px;border-radius:4px"></div></span>
          <span class="player-token__pts"><div class="skeleton" style="width:42%;height:10px;border-radius:4px"></div></span>
        </button>`;
      }
    }
    pitch.innerHTML = html;

    const list = document.getElementById("poolList");
    let listHtml = "";
    for (let i = 0; i < 7; i++) {
      listHtml += `<div class="skeleton" style="height:56px;margin-bottom:8px"></div>`;
    }
    list.innerHTML = listHtml;
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
    const budgetLabel = budgetPct > 1 ? t("badge.over_budget") : `$${used.toFixed(1)}m / $${RULES.budgetCap}m`;
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
        ${t("squad.transfers_left", transfersLeft)}
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
        msg = t("squad.tap_empty");
      } else if (count < 11) {
        msg = t("squad.good_progress", count);
      } else if (used > RULES.budgetCap) {
        msg = t("squad.over_budget_tip");
      } else if (!State.squadSaved) {
        msg = t("squad.ready_to_save");
      } else {
        el.hidden = true;
        return;
      }
    } else if (mode === "transfer") {
      if (used > RULES.budgetCap) {
        msg = t("squad.budget_under_50_confirm");
      } else if (pending.length === 0) {
        msg = t("squad.remove_then_add");
      } else {
        msg = t("squad.swaps_staged", pending.length);
      }
    } else {
      el.hidden = true;
      return;
    }

    el.hidden = false;
    el.innerHTML = `<span class="tip-banner__text">${msg}</span>
      <button class="tip-banner__close" type="button" aria-label="${t("squad.dismiss_tip")}">\u00d7</button>`;

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
