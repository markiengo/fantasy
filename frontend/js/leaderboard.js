const Leaderboard = (() => {
  let _mode = "overall";
  let _selectedMd = null;
  let _myUserId = null;

  function avatarUrl(seed) {
    return "https://api.dicebear.com/9.x/personas/svg?seed=" + encodeURIComponent(seed) + "&backgroundColor=ffd5dc,e6d4f0,c4f0e8,ffe8c4,d4e8ff&radius=50";
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function formatTimeLeft(hours) {
    var h = Number(hours) || 0;
    if (h <= 0) return '0h';
    var days = Math.floor(h / 24);
    var remHours = Math.round(h % 24);
    if (days > 0) return days + 'd ' + remHours + 'h';
    return Math.round(h) + 'h';
  }

  function skeletonRows(n, showDelta) {
    let html = '<div class="lb-table__head lb-table__head--skeleton">';
    html += '<span class="skeleton" style="width:32px"></span>';
    html += '<span class="skeleton" style="width:120px"></span>';
    if (showDelta) html += '<span class="skeleton" style="width:32px"></span>';
    html += '<span class="skeleton" style="width:44px"></span>';
    html += '<span class="skeleton" style="width:44px"></span>';
    html += '</div>';
    for (let i = 0; i < n; i++) {
      html += '<div class="lb-skeleton-row">';
      html += '<div class="skeleton" style="width:24px"></div>';
      html += '<div class="lb-skeleton-manager">';
      html += '<div class="skeleton" style="width:30px;height:30px;border-radius:50%"></div>';
      html += '<div class="skeleton" style="width:55%;max-width:180px"></div>';
      html += '</div>';
      if (showDelta) html += '<div class="skeleton" style="width:32px"></div>';
      html += '<div class="skeleton" style="width:44px"></div>';
      html += '<div class="skeleton" style="width:42px"></div>';
      html += '</div>';
    }
    return html;
  }

  function normalizeMatchdays(value) {
    const matchdays = [];
    if (!value) return matchdays;
    for (const md of value) {
      const parsed = Number(md);
      if (!Number.isNaN(parsed)) matchdays.push(parsed);
    }
    matchdays.sort(function (a, b) { return a - b; });
    return matchdays;
  }

  function chooseDefaultMatchday(availableMatchdays) {
    if (_selectedMd != null) return;
    if (availableMatchdays.length) {
      _selectedMd = availableMatchdays[availableMatchdays.length - 1];
      return;
    }
    if (_roundMeta.length) {
      _selectedMd = _roundMeta[0].matchday;
    }
  }

  function sameUser(entry) {
    if (_myUserId == null || !entry || entry.user_id == null) return false;
    return String(entry.user_id) === String(_myUserId);
  }

  function updateAdminBadge(entries) {
    const badge = document.getElementById("lbAdminBadge");
    const ptsEl = document.getElementById("lbAdminPts");
    if (!badge || !ptsEl) return;
    if (!window._isAdmin) {
      badge.hidden = true;
      return;
    }
    const myEntry = currentUserEntry(entries);
    const pts = myEntry ? pointsValue(myEntry) : 0;
    ptsEl.textContent = pts;
    badge.hidden = false;
    badge.title = "Admin — just here for vibes";
  }

  function rankClass(entry) {
    if (entry.rank === 1) return " lb-row--rank-1";
    if (entry.rank === 2) return " lb-row--rank-2";
    if (entry.rank === 3) return " lb-row--rank-3";
    return "";
  }

  function pointsValue(entry) {
    if (!entry) return 0;
    const raw = entry.squad_score != null ? entry.squad_score : entry.score;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
  }

  function formatPoints(entry) {
    return pointsValue(entry).toLocaleString();
  }

  function displayName(entry) {
    if (!entry) return t("lb.unranked");
    return entry.display_name || t("lb.manager_n", entry.rank);
  }

  function leaderEntry(entries) {
    if (!entries.length) return null;
    for (const entry of entries) {
      if (entry.rank === 1) return entry;
    }
    return entries[0];
  }

  function currentUserEntry(entries) {
    for (const entry of entries) {
      if (sameUser(entry)) return entry;
    }
    return null;
  }

  function renderSummary(entries, myEntry) {
    const leader = leaderEntry(entries);
    const leaderText = leader ? escapeHtml(displayName(leader)) + " &middot; " + formatPoints(leader) + " pts" : t("lb.none");
    const youText = myEntry ? "#" + myEntry.rank + " &middot; " + formatPoints(myEntry) + " pts" : t("lb.unranked");

    const trophyIcon = '<svg class="lb-summary__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 5H3v3a4 4 0 0 0 4 4M19 5h2v3a4 4 0 0 1-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const userIcon = '<svg class="lb-summary__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const usersIcon = '<svg class="lb-summary__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 20a7 7 0 0 1 14 0M17 11a3.5 3.5 0 1 0 0-7M22 20a6 6 0 0 0-5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    let html = "";
    html += '<div class="lb-summary__item lb-summary__item--leader"><div class="lb-summary__label-row">' + trophyIcon + '<span>' + t("lb.leader") + '</span></div><strong>' + leaderText + '</strong></div>';
    html += '<div class="lb-summary__item lb-summary__item--you"><div class="lb-summary__label-row">' + userIcon + '<span>' + t("lb.you") + '</span></div><strong>' + youText + '</strong></div>';
    html += '<div class="lb-summary__item lb-summary__item--managers"><div class="lb-summary__label-row">' + usersIcon + '<span>' + t("lb.managers") + '</span></div><strong>' + entries.length + '</strong></div>';
    return html;
  }

  function renderTableHeader(showDelta) {
    let html = '<div class="lb-table__head" role="row">';
    html += '<span class="lb-table__rank" role="columnheader">' + t("lb.rank") + '</span>';
    html += '<span class="lb-table__manager" role="columnheader">' + t("lb.manager") + '</span>';
    if (showDelta) html += '<span class="lb-table__delta" role="columnheader">' + t("lb.delta") + '</span>';
    html += '<span class="lb-table__timeleft" role="columnheader">\u23F1 ' + t("lb.before_ko") + '</span>';
    html += '<span class="lb-table__score" role="columnheader">' + t("lb.pts") + '</span>';
    html += '</div>';
    return html;
  }

  function renderDelta(entry) {
    if (entry.delta == null || Number.isNaN(Number(entry.delta))) {
      return '<span class="lb-row__delta lb-row__delta--flat">0</span>';
    }
    const delta = Number(entry.delta);
    if (delta > 0) {
      return '<span class="lb-row__delta lb-row__delta--up">+' + delta + '</span>';
    }
    if (delta < 0) {
      return '<span class="lb-row__delta lb-row__delta--down">' + delta + '</span>';
    }
    return '<span class="lb-row__delta lb-row__delta--flat">0</span>';
  }

  function renderRows(entries, showDelta) {
    let html = "";
    const totalEntries = entries.length;
    for (const entry of entries) {
      const isMe = sameUser(entry);
      const isAdmin = entry.is_admin === true;
      const rankCls = rankClass(entry);
      const meCls = isMe ? " lb-row--me" : "";
      const adminCls = isAdmin ? " lb-row--admin" : "";
      const youTag = isMe ? '<span class="lb-row__you">' + t("lb.you") + '</span>' : "";
      const adminTag = isAdmin ? '<span class="lb-row__admin-tag">' + t("lb.admin") + '</span>' : "";
      const seed = entry.display_name || entry.user_id || entry.rank;

      html += '<div class="lb-row' + rankCls + meCls + adminCls + '" role="row">';
      html += '<span class="lb-row__rank" role="cell">' + entry.rank + '</span>';
      html += '<span class="lb-row__manager" role="cell">';
      html += '<span class="lb-row__avatar" style="background-image:url(\'' + avatarUrl(seed) + '\')"></span>';
      html += '<span class="lb-row__name"><span class="lb-row__name-text">' + escapeHtml(displayName(entry)) + '</span>' + youTag + adminTag + '</span>';
      html += '</span>';
      if (showDelta) html += '<span class="lb-row__delta-cell" role="cell">' + renderDelta(entry) + '</span>';
      html += '<span class="lb-row__timeleft" role="cell">' + formatTimeLeft(entry.time_left) + '</span>';
      html += '<span class="lb-row__score" role="cell">' + formatPoints(entry) + '</span>';
      html += '</div>';
    }
    return html;
  }

  function renderTable(entries, showDelta) {
    return renderTableHeader(showDelta) + renderRows(entries, showDelta);
  }

  function renderSticky(myEntry) {
    if (!myEntry) return "";
    return '<div class="lb-sticky">'
      + '<span class="lb-sticky__label">' + t("lb.you") + '</span>'
      + '<span class="lb-sticky__rank">#' + myEntry.rank + '</span>'
      + '<span class="lb-sticky__name">' + escapeHtml(displayName(myEntry)) + '</span>'
      + '<span class="lb-sticky__score">' + formatPoints(myEntry) + '</span>'
      + '</div>';
  }

  function roundDisplayLabel(md, meta) {
    if (meta && meta.label) return meta.label;
    if (md >= 1 && md <= 3) return t("stage.group_stage", md);
    if (md === 4) return t("stage.round_of_32");
    if (md === 5) return t("stage.round_of_16");
    if (md === 6) return t("stage.quarter_final");
    if (md === 7) return t("stage.semi_final");
    if (md === 8) return t("stage.final");
    return t("stage.group_stage", md);
  }

  function buildMatchdayStrip(scoredSet) {
    const strip = document.getElementById("lbMdStrip");
    if (!strip) return;
    if (_mode !== "matchday" && _mode !== "popular") { strip.hidden = true; return; }
    strip.hidden = false;

    const allMd = [];
    for (const meta of _roundMeta) {
      allMd.push(meta.matchday);
    }
    if (!allMd.length) { strip.innerHTML = ""; return; }

    if (_selectedMd == null || !allMd.includes(_selectedMd)) {
      _selectedMd = allMd[0];
    }

    let html = "";
    for (const md of allMd) {
      const meta = _roundMeta.find(function (r) { return r.matchday === md; });
      const label = roundDisplayLabel(md, meta);
      const active = md === _selectedMd;
      const hasData = scoredSet && scoredSet.has(md);
      const cls = "lb-md-tab" + (active ? " is-active" : "") + (!hasData ? " lb-md-tab--empty" : "");
      html += '<button class="' + cls + '" type="button" data-md="' + md + '">' + escapeHtml(label) + '</button>';
    }
    strip.innerHTML = html;

    strip.querySelectorAll(".lb-md-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        _selectedMd = Number(btn.dataset.md);
        render();
      });
    });
  }

  function renderPopularCards(players) {
    if (!players || !players.length) {
      return '<div class="lb-pop-empty">' + t("lb.no_popular") + '</div>';
    }

    const maxRate = players[0].pick_rate || 1;
    let html = "";
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const rank = i + 1;
      const isCaptain = p.captain_count > 0;
      const barWidth = maxRate > 0 ? (p.pick_rate / maxRate * 100) : 0;
      const flagHtml = flagImg(p.team_id, "lb-pop-card__flag");

      html += '<div class="lb-pop-card">';
      html += '<div class="lb-pop-card__head">';
      html += '<div class="lb-pop-card__info">';
      html += '<div class="lb-pop-card__name-row">';
      html += '<span class="lb-pop-card__rank">' + rank + '</span>';
      html += '<span class="lb-pop-card__name">' + escapeHtml(p.name) + '</span>';
      if (isCaptain) html += '<span class="lb-pop-card__captain-badge" title="' + t("lb.captain_picks_title", p.captain_count) + '">C</span>';
      html += '</div>';
      html += '<div class="lb-pop-card__name-row">';
      html += '<span class="lb-pop-card__pos-pill" data-pos="' + escapeHtml(p.position) + '">' + escapeHtml(p.position) + '</span>';
      html += '<span class="lb-pop-card__team">' + flagHtml + escapeHtml(p.team_name) + '</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="lb-pop-card__pick-rate">';
      html += '<span class="lb-pop-card__pick-pct">' + p.pick_rate + '%</span>';
      html += '<span class="lb-pop-card__pick-label">' + t("lb.pick_rate") + '</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="lb-pop-card__bar"><div class="lb-pop-card__bar-fill" style="width:' + barWidth + '%"></div></div>';
      html += '<div class="lb-pop-card__footer">';
      html += '<span class="lb-pop-card__picks">' + p.pick_count + ' ' + t("lb.picks") + '</span>';
      if (isCaptain) {
        html += '<span class="lb-pop-card__captains">' + p.captain_count + ' ' + (p.captain_count > 1 ? t("lb.captain_p") : t("lb.captain_s")) + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }
    return html;
  }

  async function render() {
    const list = document.getElementById("lbList");
    const popular = document.getElementById("lbPopular");
    const sticky = document.getElementById("lbSticky");
    const summary = document.getElementById("lbSummary");
    if (!list) return;

    const isPopular = _mode === "popular";
    const loadingMatchday = _mode === "matchday";

    Progress.start();

    if (isPopular) {
      list.hidden = true;
      if (popular) popular.hidden = false;
      if (sticky) sticky.innerHTML = "";
    } else {
      list.hidden = false;
      if (popular) popular.hidden = true;
      list.classList.toggle("lb-list--matchday", loadingMatchday);
      list.classList.toggle("lb-list--overall", !loadingMatchday);
      list.innerHTML = skeletonRows(6, loadingMatchday);
      if (sticky) sticky.innerHTML = "";
    }
    if (summary) summary.innerHTML = renderSummary([], null);

    let data = null;
    let availableMatchdays = [];
    try {
      if ((_mode === "matchday" || _mode === "popular") && _selectedMd == null) {
        const seed = await Api.getLeaderboard(null);
        _myUserId = seed.my_user_id || _myUserId;
        availableMatchdays = normalizeMatchdays(seed.available_matchdays);
        chooseDefaultMatchday(availableMatchdays);
      }

      const fetchMd = (_mode === "matchday" || _mode === "popular") ? _selectedMd : null;
      data = await Api.getLeaderboard(fetchMd);
      availableMatchdays = normalizeMatchdays(data.available_matchdays);
      chooseDefaultMatchday(availableMatchdays);
    } catch (e) {
      data = { entries: [], my_user_id: _myUserId, available_matchdays: availableMatchdays, popular_players: [] };
    }

    Progress.done();

    _myUserId = data.my_user_id || _myUserId;
    const allEntries = data.entries || [];
    for (const entry of allEntries) {
      if (entry.is_admin) entry.rank = 99;
    }
    const entries = allEntries;
    const nonAdminEntries = allEntries.filter(function (e) { return !e.is_admin; });
    const showDelta = _mode === "matchday";
    const scoredSet = new Set(availableMatchdays);
    const myEntry = currentUserEntry(entries);

    updateAdminBadge(allEntries);

    if (summary) summary.innerHTML = renderSummary(nonAdminEntries, myEntry);

    if (isPopular) {
      const popularPlayers = data.popular_players || [];
      if (popular) popular.innerHTML = renderPopularCards(popularPlayers);
      buildMatchdayStrip(scoredSet);
      return;
    }

    list.classList.toggle("lb-list--matchday", showDelta);
    list.classList.toggle("lb-list--overall", !showDelta);

    if (!entries.length) {
      const emptyCopy = _mode === "matchday" ? t("lb.no_data_md") : t("lb.no_data");
      list.innerHTML = '<div class="lb-empty">' + emptyCopy + '</div>';
      buildMatchdayStrip(scoredSet);
      return;
    }

    list.innerHTML = renderTable(entries, showDelta);
    if (sticky) sticky.innerHTML = renderSticky(myEntry);

    if (_mode === "matchday") {
      buildMatchdayStrip(scoredSet);
    } else {
      buildMatchdayStrip(new Set());
    }

    _cachedRender = {
      data: data,
      availableMatchdays: availableMatchdays,
      isPopular: isPopular,
      showDelta: showDelta,
      entries: entries,
      nonAdminEntries: nonAdminEntries,
      myEntry: myEntry,
    };
  }

  let _cachedRender = null;

  function retranslate() {
    if (!_cachedRender) return;
    var data = _cachedRender.data;
    var availableMatchdays = _cachedRender.availableMatchdays;
    var isPopular = _cachedRender.isPopular;
    var showDelta = _cachedRender.showDelta;
    var entries = _cachedRender.entries;
    var nonAdminEntries = _cachedRender.nonAdminEntries;
    var myEntry = _cachedRender.myEntry;
    var scoredSet = new Set(availableMatchdays);

    var list = document.getElementById("lbList");
    var popular = document.getElementById("lbPopular");
    var sticky = document.getElementById("lbSticky");
    var summary = document.getElementById("lbSummary");
    if (!list) return;

    if (summary) summary.innerHTML = renderSummary(nonAdminEntries, myEntry);

    if (isPopular) {
      var popularPlayers = data.popular_players || [];
      if (popular) popular.innerHTML = renderPopularCards(popularPlayers);
      buildMatchdayStrip(scoredSet);
      return;
    }

    list.classList.toggle("lb-list--matchday", showDelta);
    list.classList.toggle("lb-list--overall", !showDelta);

    if (!entries.length) {
      var emptyCopy = _mode === "matchday" ? t("lb.no_data_md") : t("lb.no_data");
      list.innerHTML = '<div class="lb-empty">' + emptyCopy + '</div>';
      buildMatchdayStrip(scoredSet);
      return;
    }

    list.innerHTML = renderTable(entries, showDelta);
    if (sticky) sticky.innerHTML = renderSticky(myEntry);

    if (_mode === "matchday") {
      buildMatchdayStrip(scoredSet);
    } else {
      buildMatchdayStrip(new Set());
    }
  }

  function bindToggle() {
    const btns = document.querySelectorAll(".lb-toggle__btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        _mode = btn.dataset.mode;
        render();
      });
    });
  }

  function init() {
    bindToggle();
  }

  return { render, init, retranslate };
})();


