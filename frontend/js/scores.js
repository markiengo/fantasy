/* ───────────────────────────────────────────────────────────────────────────
   Scores — Dashboard screen controller.
   Bento grid with: area trajectory, captain impact, score composition,
   rank trajectory, top scorers, value scatter, efficiency bars,
   position donut, transfer history, matchday participation.
   ─────────────────────────────────────────────────────────────────────────── */

const Scores = (() => {
  let _scoreByMd = {};       // { md: { matchday, breakdown: [...] } }
  let _cumulativeData = [];  // [{ matchday, score }]
  let _compositionByMd = {}; // { md: { goals_pts, ... } }
  let _rankHistory = [];     // [{ matchday, rank, score, total_managers }]
  let _squadByMd = {};       // { md: squadObj }
  let _transfersByMd = {};   // { md: [transferObj, ...] }
  let _allTransfers = [];
  let _selectedMd = null;
  let _scoredMatchdays = []; // matchdays that have score data
  let _hiddenPositions = {}; // scatter legend toggle state

  const POS_COLORS = {
    GK: "var(--pos-GK)",
    DEF: "var(--pos-DEF)",
    MID: "var(--pos-MID)",
    FWD: "var(--pos-FWD)"
  };

  function mdLabel(md) {
    if (md >= 1 && md <= 3) return t("stage.group_stage", md);
    if (md === 4) return t("stage.round_of_32");
    if (md === 5) return t("stage.round_of_16");
    if (md === 6) return t("stage.quarter_final");
    if (md === 7) return t("stage.semi_final");
    if (md === 8) return t("stage.final");
    return t("stage.group_stage", md);
  }

  /* ── Data loading ──────────────────────────────────────────────────────── */

  async function loadAll() {
    _cumulativeData = [];
    _scoreByMd = {};
    _compositionByMd = {};
    _rankHistory = [];
    _squadByMd = {};
    _transfersByMd = {};
    _allTransfers = [];

    /* cumulative score */
    try {
      const scoreRes = await Api.getSquadScore();
      if (scoreRes && scoreRes.by_matchday) {
        _cumulativeData = scoreRes.by_matchday;
        _scoredMatchdays = [];
        for (let i = 0; i < scoreRes.by_matchday.length; i++) {
          _scoredMatchdays.push(scoreRes.by_matchday[i].matchday);
        }
      }
    } catch (e) { /* no data yet */ }

    /* rank history */
    try {
      const rankRes = await Api.getRankHistory();
      if (rankRes && rankRes.rank_history) {
        _rankHistory = rankRes.rank_history;
      }
    } catch (e) { /* no data yet */ }

    /* per-matchday data: score breakdown, composition, squad — all in parallel */
    const mds = _scoredMatchdays.slice();
    const promises = [];
    for (let i = 0; i < mds.length; i++) {
      const md = mds[i];
      promises.push(
        Api.getSquadScore(md).then(function (r) { if (r) _scoreByMd[md] = r; }).catch(function () {})
      );
      promises.push(
        Api.getComposition(md).then(function (r) { if (r) _compositionByMd[md] = r; }).catch(function () {})
      );
      promises.push(
        Api.getSquad(md).then(function (r) { if (r) _squadByMd[md] = r; }).catch(function () {})
      );
    }
    await Promise.all(promises);

    /* transfers (all) */
    try {
      _allTransfers = await Api.getTransfers();
      for (let i = 0; i < _allTransfers.length; i++) {
        const t = _allTransfers[i];
        const md = t.matchday;
        if (!_transfersByMd[md]) _transfersByMd[md] = [];
        _transfersByMd[md].push(t);
      }
    } catch (e) { /* skip */ }

    /* default selected matchday = latest scored */
    if (_scoredMatchdays.length > 0) {
      _selectedMd = _scoredMatchdays[_scoredMatchdays.length - 1];
    }
  }

  /* ── Matchday nav ──────────────────────────────────────────────────────── */

  function renderMatchdayNav() {
    const nav = document.getElementById("dashMatchdayNav");
    if (!nav) return;

    nav.hidden = false;

    let html = '<span class="dash-md-nav__header">' + t("dash.matchday") + '</span>';
    const allMds = _scoredMatchdays.slice();
    /* add placeholder future matchdays up to 8 */
    for (let md = 1; md <= 8; md++) {
      if (allMds.indexOf(md) === -1) allMds.push(md);
    }
    allMds.sort(function (a, b) { return a - b; });

    for (let i = 0; i < allMds.length; i++) {
      const md = allMds[i];
      const hasData = _scoredMatchdays.indexOf(md) !== -1;
      const isActive = md === _selectedMd;
      html += '<button class="dash-md-tab' + (isActive ? " is-active" : "") + (!hasData ? " dash-md-tab--empty" : "") + '" type="button" data-md="' + md + '">' + mdLabel(md) + "</button>";
    }
    nav.innerHTML = html;

    const tabs = nav.querySelectorAll(".dash-md-tab");
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () {
        const md = parseInt(tabs[i].dataset.md, 10);
        if (_scoredMatchdays.indexOf(md) !== -1) {
          selectMatchday(md);
        }
      });
    }
  }

  function selectMatchday(md) {
    _selectedMd = md;
    renderAll();
  }

  /* ── Hero: total + budget + trajectory ─────────────────────────────────── */

  function renderHero() {
    const totalEl = document.getElementById("scoreTotal");
    const budgetEl = document.getElementById("budgetRemainingDash");
    const gaugeEl = document.getElementById("budgetGauge");
    const trajectoryEl = document.getElementById("scoreTrajectory");

    /* total points — cumulative up to selected MD */
    let total = 0;
    for (let i = 0; i < _cumulativeData.length; i++) {
      if (_cumulativeData[i].matchday <= _selectedMd) {
        total += _cumulativeData[i].squad_score;
      }
    }
    if (totalEl) totalEl.textContent = total;

    /* budget from selected matchday squad */
    const squad = _squadByMd[_selectedMd];
    if (squad && budgetEl) {
      budgetEl.textContent = "$" + (squad.budget_remaining || 0).toFixed(1) + "m";
    }

    /* gauge — update conic gradient based on budget used */
    if (gaugeEl && squad) {
      const used = squad.budget_used || 0;
      const pct = Math.min(1, used / 50);
      const angle = Math.round(pct * 180);
      gaugeEl.style.background =
        "radial-gradient(circle at 50% 100%, #111411 0 42%, transparent 43%)," +
        "conic-gradient(from 270deg at 50% 100%, var(--blue) 0 " + angle + "deg, rgba(255,255,255,.08) " + angle + "deg 180deg, transparent 180deg 360deg)";
    }

    /* trajectory area chart */
    if (trajectoryEl) {
      const chartData = [];
      for (let i = 0; i < _cumulativeData.length; i++) {
        chartData.push({
          md: _cumulativeData[i].matchday,
          value: _cumulativeData[i].squad_score,
          label: mdLabel(_cumulativeData[i].matchday)
        });
      }
      Charts.areaChart(trajectoryEl, chartData, {
        selectedMatchday: _selectedMd,
        onPointClick: selectMatchday
      });
    }
  }

  /* ── Captain impact ────────────────────────────────────────────────────── */

  function renderCaptainImpact() {
    const container = document.getElementById("captainChart");
    if (!container) return;

    const chartData = [];
    const mds = _scoredMatchdays.slice();
    for (let i = 0; i < mds.length; i++) {
      const md = mds[i];
      const breakdown = _scoreByMd[md];
      if (!breakdown || !breakdown.breakdown) continue;

      let captainScore = 0;
      let squadSum = 0;
      let squadCount = 0;
      for (let j = 0; j < breakdown.breakdown.length; j++) {
        const p = breakdown.breakdown[j];
        if (p.is_captain) {
          captainScore = p.player_score;
        } else {
          squadSum += p.player_score;
          squadCount++;
        }
      }
      const squadAvg = squadCount > 0 ? squadSum / squadCount : 0;
      chartData.push({
        md: md,
        label: mdLabel(md),
        captainScore: captainScore,
        squadAvg: squadAvg
      });
    }

    Charts.captainBars(container, chartData, {
      selectedMatchday: _selectedMd,
      onBarClick: selectMatchday
    });
  }

  /* ── Score composition ─────────────────────────────────────────────────── */

  function renderComposition() {
    const posContainer = document.getElementById("compositionChartPos");
    const posLegend = document.getElementById("compositionLegendPos");
    const negContainer = document.getElementById("compositionChartNeg");
    const negLegend = document.getElementById("compositionLegendNeg");

    const chartData = [];
    const mds = _scoredMatchdays.slice();
    for (let i = 0; i < mds.length; i++) {
      const md = mds[i];
      const comp = _compositionByMd[md];
      if (!comp) continue;
      chartData.push({
        md: md,
        label: mdLabel(md),
        goals_pts: comp.goals_pts || 0,
        assist_pts: comp.assist_pts || 0,
        cs_pts: comp.cs_pts || 0,
        minute_pts: comp.minute_pts || 0,
        card_pts: comp.card_pts || 0,
        saves_pts: comp.saves_pts || 0,
        sot_pts: comp.sot_pts || 0,
        own_goal_pts: comp.own_goal_pts || 0,
        foul_pts: comp.foul_pts || 0,
        offside_pts: comp.offside_pts || 0,
        gc_pts: comp.gc_pts || 0,
        total: comp.total || 0
      });
    }

    if (posContainer) {
      Charts.stackedBar(posContainer, chartData, {
        selectedMatchday: _selectedMd,
        onBarClick: selectMatchday,
        legendContainer: posLegend,
        segments: "positive"
      });
    }
    if (negContainer) {
      Charts.stackedBar(negContainer, chartData, {
        selectedMatchday: _selectedMd,
        onBarClick: selectMatchday,
        legendContainer: negLegend,
        segments: "negative"
      });
    }
  }

  /* ── Rank trajectory ───────────────────────────────────────────────────── */

  function renderRankTrajectory() {
    const container = document.getElementById("rankChart");
    if (!container) return;

    const chartData = [];
    for (let i = 0; i < _rankHistory.length; i++) {
      chartData.push({
        matchday: _rankHistory[i].matchday,
        rank: _rankHistory[i].rank,
        squad_score: _rankHistory[i].squad_score,
        total_managers: _rankHistory[i].total_managers,
        label: mdLabel(_rankHistory[i].matchday)
      });
    }

    Charts.rankLine(container, chartData, {
      selectedMatchday: _selectedMd,
      onPointClick: selectMatchday
    });
  }

  /* ── Top scorers (selected matchday breakdown) ─────────────────────────── */

  function renderTopScorers() {
    const list = document.getElementById("contribBody");
    if (!list) return;

    const breakdown = _scoreByMd[_selectedMd];
    if (!breakdown || !breakdown.breakdown || !breakdown.breakdown.length) {
      list.innerHTML = '<p class="empty-note">' + t("dash.no_player_data") + '</p>';
      return;
    }

    const players = breakdown.breakdown.slice();
    players.sort(function (a, b) { return b.player_score - a.player_score; });

    let html = "";
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const seed = encodeURIComponent(p.player_name).replace(/'/g, "%27");
      const avatarSrc = "https://api.dicebear.com/9.x/micah/svg?seed=" + seed + "&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50";
      const posColor = POS_COLORS[p.position] || "var(--ink)";
      const cls = p.player_score < 0 ? " scorer-pts--neg" : "";
      const cap = p.is_captain ? '<span class="scorer-cap">C</span>' : "";
      const x2 = p.is_captain ? '<span class="scorer-x2">x2</span>' : "";
      html += '<li><span class="rank">' + (i + 1) + "</span>" +
        '<span class="avatar avatar--30" style="background-image:url(\'' + avatarSrc + '\')"></span>' +
        '<span class="scorer-name">' + escapeHtml(p.player_name) + " " + cap + "</span>" +
        '<i class="pos pos--' + p.position.toLowerCase() + '">' + p.position + "</i>" +
        x2 +
        '<b class="scorer-pts' + cls + '" style="color:' + posColor + '">' + p.player_score + "</b></li>";
    }
    list.innerHTML = html;
  }

  /* ── Value scatter + efficiency bars ───────────────────────────────────── */

  function renderValueScatter() {
    const container = document.getElementById("valueScatter");
    const legendContainer = document.getElementById("scatterLegend");
    if (!container) return;

    const breakdown = _scoreByMd[_selectedMd];
    const squad = _squadByMd[_selectedMd];
    if (!breakdown || !squad) {
      container.innerHTML = '<p class="empty-note">' + t("dash.no_data_md") + '</p>';
      if (legendContainer) legendContainer.innerHTML = "";
      return;
    }

    /* build player price map from squad */
    const priceMap = {};
    for (let i = 0; i < squad.players.length; i++) {
      priceMap[squad.players[i].player_id] = squad.players[i].base_price;
    }

    const scatterData = [];
    for (let i = 0; i < breakdown.breakdown.length; i++) {
      const p = breakdown.breakdown[i];
      const price = priceMap[p.player_id] || 0;
      scatterData.push({
        name: p.player_name,
        position: p.position,
        price: price,
        points: p.player_score
      });
    }

    Charts.scatterPlot(container, scatterData, {
      posColors: POS_COLORS,
      hiddenPositions: _hiddenPositions,
      legendContainer: legendContainer,
      onLegendToggle: function (pos) {
        _hiddenPositions[pos] = !_hiddenPositions[pos];
        renderValueScatter();
      }
    });
  }

  function renderEfficiencyBars() {
    const container = document.getElementById("valueRows");
    if (!container) return;

    const breakdown = _scoreByMd[_selectedMd];
    const squad = _squadByMd[_selectedMd];
    if (!breakdown || !squad) {
      container.innerHTML = '<p class="empty-note">' + t("dash.no_data_md") + '</p>';
      return;
    }

    const priceMap = {};
    for (let i = 0; i < squad.players.length; i++) {
      priceMap[squad.players[i].player_id] = squad.players[i].base_price;
    }

    const rows = [];
    for (let i = 0; i < breakdown.breakdown.length; i++) {
      const p = breakdown.breakdown[i];
      const price = priceMap[p.player_id] || 0;
      const ratio = price > 0 ? p.player_score / price : 0;
      rows.push({
        name: p.player_name,
        position: p.position,
        price: price,
        points: p.player_score,
        ratio: ratio
      });
    }
    rows.sort(function (a, b) { return b.ratio - a.ratio; });

    let maxRatio = 1;
    for (let i = 0; i < rows.length; i++) {
      if (Math.abs(rows[i].ratio) > maxRatio) maxRatio = Math.abs(rows[i].ratio);
    }

    let html = "";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const pct = Math.max(3, Math.abs(r.ratio) / maxRatio * 100);
      const color = POS_COLORS[r.position] || "var(--accent)";
      html += '<div class="value-row">' +
        '<span class="value-name">' + escapeHtml(r.name) + "</span>" +
        '<span class="value-ratio">' + r.ratio.toFixed(1) + " " + t("dash.pts_per_m") + "</span>" +
        '<div class="value-bar-wrap"><div class="value-bar" style="width:' + pct + "%;background:" + color + '"></div></div>' +
        "</div>";
    }
    container.innerHTML = html;
  }

  /* ── Position donut (selected matchday) ────────────────────────────────── */

  function renderDonut() {
    const svgEl = document.getElementById("scoreDonut");
    const centerEl = document.getElementById("donutCenter");
    const legendEl = document.getElementById("donutLegend");
    if (!svgEl) return;

    const breakdown = _scoreByMd[_selectedMd];
    if (!breakdown || !breakdown.breakdown) {
      if (centerEl) centerEl.textContent = "0";
      if (legendEl) legendEl.innerHTML = '<span class="empty-note">' + t("dash.no_data") + '</span>';
      return;
    }

    const posSums = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (let i = 0; i < breakdown.breakdown.length; i++) {
      const p = breakdown.breakdown[i];
      const pos = p.position;
      if (posSums[pos] !== undefined) posSums[pos] += p.player_score;
    }

    const data = [
      { label: "GK", value: Math.max(0, posSums.GK), color: POS_COLORS.GK },
      { label: "DEF", value: Math.max(0, posSums.DEF), color: POS_COLORS.DEF },
      { label: "MID", value: Math.max(0, posSums.MID), color: POS_COLORS.MID },
      { label: "FWD", value: Math.max(0, posSums.FWD), color: POS_COLORS.FWD }
    ];

    Charts.donut(svgEl, centerEl, legendEl, data);
  }

  /* ── Transfer history — expandable accordion ───────────────────────────── */

  let _expandedTransferMd = null;

  function renderTransfers() {
    const container = document.getElementById("transferHistory");
    if (!container) return;

    if (!_allTransfers.length) {
      container.innerHTML = '<p class="empty-note">' + t("dash.no_transfers") + '</p>';
      return;
    }

    /* group by matchday */
    const mds = [];
    const mdMap = {};
    for (let i = 0; i < _allTransfers.length; i++) {
      const t = _allTransfers[i];
      const md = t.matchday;
      if (mdMap[md] === undefined) {
        mdMap[md] = mds.length;
        mds.push({ md: md, transfers: [] });
      }
      mds[mdMap[md]].transfers.push(t);
    }
    mds.sort(function (a, b) { return b.md - a.md; });

    let html = "";
    for (let i = 0; i < mds.length; i++) {
      const group = mds[i];
      const isOpen = group.md === _expandedTransferMd;
      const count = group.transfers.length;

      /* net budget change */
      let netCost = 0;
      for (let j = 0; j < group.transfers.length; j++) {
        const t = group.transfers[j];
        const inPrice = t.player_in_price || 0;
        const outPrice = t.player_out_price || 0;
        netCost += inPrice - outPrice;
      }
      const netCls = netCost >= 0 ? "xfer-md-header__net--neg" : "xfer-md-header__net--pos";
      const netSign = netCost > 0 ? "+" : "";
      const netLabel = netCost !== 0 ? "$" + netSign + netCost.toFixed(1) + "m" : t("dash.even");

      html += '<div class="xfer-md-group' + (isOpen ? " is-open" : "") + '" data-md="' + group.md + '">';
      html += '<div class="xfer-md-header">';
      html += '<svg class="xfer-md-chevron" viewBox="0 0 16 16" fill="none"><path d="M6 4l6 4-6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      html += '<span class="xfer-md-header__label">' + mdLabel(group.md) + "</span>";
      html += '<span class="xfer-md-header__count">' + (count === 1 ? t("dash.transfer_count", count) : t("dash.transfer_count_plural", count)) + "</span>";
      html += '<span class="xfer-md-header__net ' + netCls + '">' + netLabel + "</span>";
      html += "</div>";
      html += '<div class="xfer-md-body">';

      for (let j = 0; j < group.transfers.length; j++) {
        const xf = group.transfers[j];
        const inPrice = xf.player_in_price != null ? "$" + xf.player_in_price.toFixed(1) + "m" : "";
        const outPrice = xf.player_out_price != null ? "$" + xf.player_out_price.toFixed(1) + "m" : "";

        html += '<div class="xfer-card">';
        html += '<div class="xfer-card__row xfer-card__row--out">';
        html += '<span class="xfer-arrow xfer-arrow--out"><svg viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4v8H4" stroke="currentColor" stroke-width="1.5"/></svg></span>';
        html += '<span class="xfer-name">' + escapeHtml(xf.player_out_name || t("dash.unknown")) + "</span>";
        if (outPrice) html += '<span class="xfer-price">' + outPrice + "</span>";
        html += '<span class="xfer-badge xfer-badge--out">' + t("dash.out") + '</span>';
        html += "</div>";
        html += '<div class="xfer-card__row">';
        html += '<span class="xfer-arrow xfer-arrow--in"><svg viewBox="0 0 16 16" fill="none"><path d="M12 12L4 4M4 12v-8h8" stroke="currentColor" stroke-width="1.5"/></svg></span>';
        html += '<span class="xfer-name">' + escapeHtml(xf.player_in_name || t("dash.unknown")) + "</span>";
        if (inPrice) html += '<span class="xfer-price">' + inPrice + "</span>";
        html += '<span class="xfer-badge xfer-badge--in">' + t("dash.in") + '</span>';
        html += "</div>";
        html += "</div>";
      }

      html += "</div></div>";
    }
    container.innerHTML = html;

    /* bind click handlers */
    const groups = container.querySelectorAll(".xfer-md-group");
    for (let i = 0; i < groups.length; i++) {
      groups[i].querySelector(".xfer-md-header").addEventListener("click", function () {
        const md = parseInt(groups[i].dataset.md, 10);
        if (_expandedTransferMd === md) {
          _expandedTransferMd = null;
        } else {
          _expandedTransferMd = md;
        }
        renderTransfers();
      });
    }
  }

  /* ── Master render ─────────────────────────────────────────────────────── */

  function renderAll() {
    renderMatchdayNav();
    renderHero();
    renderCaptainImpact();
    renderComposition();
    renderRankTrajectory();
    renderTopScorers();
    renderValueScatter();
    renderEfficiencyBars();
    renderDonut();
    renderTransfers();
  }

  /* ── Public API ────────────────────────────────────────────────────────── */

  async function init() {
    Progress.start();
    try {
      await loadAll();
      renderAll();
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      Progress.done();
    }
  }

  function refresh() {
    return init();
  }

  return { init: init, render: refresh, refresh: refresh };
})();


