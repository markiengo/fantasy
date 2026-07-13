/* ───────────────────────────────────────────────────────────────────────────
   Scores — Dashboard screen controller.
   Bento grid with: area trajectory, captain impact, score composition,
   rank trajectory, top scorers, value scatter, efficiency bars,
   position donut, transfer history, matchday participation.
   ─────────────────────────────────────────────────────────────────────────── */

const Scores = (() => {
  let _scoreByMd = {};       // { md: { matchday, breakdown: [...] } }
  let _breakdownByMd = {};    // { md: { matchday, players: [...] } }
  let _cumulativeData = [];  // [{ matchday, score }]
  let _compositionByMd = {}; // { md: { goals_pts, ... } }
  let _roundPointsByMd = {}; // { md: { matchday, points, rank, total_managers } }
  let _leagueComparison = []; // [{ matchday, user_score, league_avg }]
  let _squadByMd = {};       // { md: squadObj }
  let _transfersByMd = {};   // { md: [transferObj, ...] }
  let _allTransfers = [];
  let _selectedMd = null;
  let _scoredMatchdays = []; // matchdays that have score data
  let _hiddenPositions = {}; // scatter legend toggle state
  let _loadVersion = 0;
  let _roundPointsLoading = false;
  let _dashboardLoaded = false;
  let _dashboardLoadPromise = null;

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

  function storeRoundPoints(matchday, leaderboard) {
    if (!leaderboard || !leaderboard.entries) return;

    let myEntry = null;
    let totalManagers = 0;
    for (let i = 0; i < leaderboard.entries.length; i++) {
      const entry = leaderboard.entries[i];
      if (!entry.is_admin) totalManagers = totalManagers + 1;
      if (String(entry.user_id) === String(leaderboard.my_user_id)) {
        myEntry = entry;
      }
    }

    if (!myEntry) return;
    _roundPointsByMd[matchday] = {
      matchday: matchday,
      points: Number(myEntry.squad_score) || 0,
      rank: myEntry.rank,
      total_managers: totalManagers,
      is_admin: Boolean(myEntry.is_admin)
    };
  }
  async function loadSelectedMatchday(matchday, loadVersion) {
    const data = await Promise.all([
      Api.getSquad(matchday).catch(function () { return null; }),
      Api.getPlayerBreakdown(matchday).catch(function () { return null; })
    ]);

    if (loadVersion !== _loadVersion) return;
    if (data[0]) _squadByMd[matchday] = data[0];
    if (data[1]) _breakdownByMd[matchday] = data[1];
  }

  async function loadRoundRanks(matchdays, loadVersion) {
    const requests = [];
    for (let i = 0; i < matchdays.length; i++) {
      const md = matchdays[i];
      requests.push(
        Api.getLeaderboard(md, false, false).then(function (result) {
          if (loadVersion === _loadVersion) storeRoundPoints(md, result);
        }).catch(function () {})
      );
    }

    await Promise.all(requests);
    if (loadVersion !== _loadVersion) return;
    _roundPointsLoading = false;
    renderRoundRank();
  }

  function storeTransfers(transfers) {
    _allTransfers = transfers || [];
    for (let i = 0; i < _allTransfers.length; i++) {
      const transfer = _allTransfers[i];
      const md = transfer.matchday;
      if (!_transfersByMd[md]) _transfersByMd[md] = [];
      _transfersByMd[md].push(transfer);
    }
  }

  async function loadAll() {
    const loadVersion = _loadVersion + 1;
    _loadVersion = loadVersion;
    _cumulativeData = [];
    _scoreByMd = {};
    _breakdownByMd = {};
    _compositionByMd = {};
    _roundPointsByMd = {};
    _leagueComparison = [];
    _squadByMd = {};
    _transfersByMd = {};
    _allTransfers = [];

    const dashboard = await Api.getDashboard();
    if (loadVersion !== _loadVersion) return null;

    _cumulativeData = dashboard.by_matchday || [];
    _scoredMatchdays = [];
    for (let i = 0; i < _cumulativeData.length; i++) {
      _scoredMatchdays.push(_cumulativeData[i].matchday);
    }

    const scoreBreakdowns = dashboard.score_breakdowns || [];
    for (let i = 0; i < scoreBreakdowns.length; i++) {
      const score = scoreBreakdowns[i];
      _scoreByMd[score.matchday] = score;
    }

    const compositions = dashboard.compositions || [];
    for (let i = 0; i < compositions.length; i++) {
      const composition = compositions[i];
      _compositionByMd[composition.matchday] = composition;
    }

    _leagueComparison = dashboard.league_comparison || [];
    storeTransfers(dashboard.transfers);
    _selectedMd = dashboard.selected_matchday;
    if (_selectedMd == null && _scoredMatchdays.length > 0) {
      _selectedMd = _scoredMatchdays[_scoredMatchdays.length - 1];
    }
    if (dashboard.selected_squad && _selectedMd != null) {
      _squadByMd[_selectedMd] = dashboard.selected_squad;
    }
    if (dashboard.player_breakdown && dashboard.player_breakdown.matchday != null) {
      _breakdownByMd[dashboard.player_breakdown.matchday] = dashboard.player_breakdown;
    }

    _roundPointsLoading = _scoredMatchdays.length > 0;
    return { loadVersion: loadVersion, matchdays: _scoredMatchdays.slice() };
  }
  /* Dashboard matchday navigation. */
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
    if (_scoredMatchdays.indexOf(md) === -1 || md === _selectedMd) return;
    _selectedMd = md;
    renderAll();

    if (_squadByMd[md] && _breakdownByMd[md]) return;
    const loadVersion = _loadVersion;
    loadSelectedMatchday(md, loadVersion).then(function () {
      if (loadVersion === _loadVersion && _selectedMd === md) renderAll();
    });
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

  function renderRoundRank() {
    const container = document.getElementById("roundPointsChart");
    if (!container) return;

    if (_roundPointsLoading) {
      container.innerHTML = '<p class="empty-note">' + t("dash.loading_round_rank") + '</p>';
      return;
    }

    const chartData = [];
    const mds = _scoredMatchdays.slice();
    for (let i = 0; i < mds.length; i++) {
      const md = mds[i];
      const row = _roundPointsByMd[md];
      if (!row || !row.rank || row.rank < 1) continue;
      chartData.push({
        matchday: md,
        rank: row.rank,
        squad_score: row.points,
        total_managers: row.total_managers,
        label: mdLabel(md)
      });
    }

    Charts.rankLine(container, chartData, {
      selectedMatchday: _selectedMd,
      onPointClick: selectMatchday
    });
  }

  function renderLeagueComparison() {
    var container = document.getElementById("leagueChart");
    if (!container) return;

    var chartData = [];
    for (var i = 0; i < _leagueComparison.length; i++) {
      chartData.push({
        matchday: _leagueComparison[i].matchday,
        user_score: _leagueComparison[i].user_score,
        league_avg: _leagueComparison[i].league_avg,
        label: mdLabel(_leagueComparison[i].matchday)
      });
    }

    Charts.leagueComparison(container, chartData, {
      selectedMatchday: _selectedMd,
      onPointClick: selectMatchday
    });
  }

  /* ── Player breakdown (selected matchday) ─────────────────────────────── */

  var _expandedBreakdownPid = null;

  function renderPlayerBreakdown() {
    var container = document.getElementById("breakdownBody");
    if (!container) return;

    var data = _breakdownByMd[_selectedMd];
    if (!data || !data.players || !data.players.length) {
      container.innerHTML = '<p class="empty-note">' + t("dash.no_player_data") + '</p>';
      return;
    }

    var players = data.players.slice();
    players.sort(function (a, b) { return b.total_points - a.total_points; });

    var html = "";
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var seed = encodeURIComponent(p.name).replace(/'/g, "%27");
      var avatarSrc = "https://api.dicebear.com/9.x/micah/svg?seed=" + seed + "&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50";
      var posColor = POS_COLORS[p.position] || "var(--ink)";
      var cap = p.is_captain ? '<span class="scorer-cap">C</span>' : "";
      var ptsCls = p.total_points < 0 ? " breakdown-pts--neg" : "";
      var expanded = _expandedBreakdownPid === p.player_id;

      var allZero = p.has_stats;
      if (p.has_stats) {
        for (var k in p.raw) {
          if (p.raw[k] !== 0) { allZero = false; break; }
        }
      }

      var badge = "";
      var chevron = "";
      var expandHtml = "";

      if (!p.has_stats) {
        badge = '<span class="breakdown-badge breakdown-badge--nodata">' + t("dash.no_data") + '</span>';
      } else if (allZero) {
        badge = '<span class="breakdown-badge breakdown-badge--dnp">' + t("dash.dnp") + '</span>';
      } else {
        chevron = '<span class="breakdown-chevron' + (expanded ? " is-open" : "") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><path d="M6 9l6 6 6-6"/></svg></span>';
        if (expanded) {
          expandHtml = renderBreakdownDetail(p);
        }
      }

      html += '<div class="breakdown-row' + (expanded ? " is-open" : "") + '" data-pid="' + p.player_id + '">' +
        '<div class="breakdown-row__head">' +
          '<span class="breakdown-rank">' + (i + 1) + '</span>' +
          '<span class="avatar avatar--30" style="background-image:url(\'' + avatarSrc + '\')"></span>' +
          '<span class="breakdown-name">' + escapeHtml(p.name) + " " + cap + '</span>' +
          '<i class="pos pos--' + p.position.toLowerCase() + '">' + p.position + '</i>' +
          badge +
          '<b class="breakdown-pts' + ptsCls + '" style="color:' + posColor + '">' + p.total_points + '</b>' +
          chevron +
        '</div>' +
        expandHtml +
      '</div>';
    }
    container.innerHTML = html;

    var rows = container.querySelectorAll(".breakdown-row");
    for (var j = 0; j < rows.length; j++) {
      (function (row) {
        var pid = parseInt(row.dataset.pid, 10);
        var head = row.querySelector(".breakdown-row__head");
        if (head) {
          head.addEventListener("click", function () {
            if (_expandedBreakdownPid === pid) {
              _expandedBreakdownPid = null;
            } else {
              _expandedBreakdownPid = pid;
            }
            renderPlayerBreakdown();
          });
        }
      })(rows[j]);
    }
  }

  function renderBreakdownDetail(player) {
    var sp = player.stat_points;
    if (!sp || !sp.length) return "";

    var html = '<div class="breakdown-detail">';
    for (var i = 0; i < sp.length; i++) {
      var s = sp[i];
      var isNeg = s.pts < 0;
      var cls = isNeg ? " breakdown-stat--neg" : " breakdown-stat--pos";
      var capNote = s.is_captain_doubled ? ' <span class="breakdown-cap-x2">' + t("dash.captain_x2") + '</span>' : "";
      var ptsStr = s.pts >= 0 ? "+" + s.pts : "" + s.pts;
      var formulaStr;
      if (s.is_flat) {
        formulaStr = s.value + " min";
      } else {
        var multStr = s.multiplier >= 0 ? "+" + s.multiplier : "" + s.multiplier;
        formulaStr = s.value + " \u00d7 " + multStr;
      }
      html += '<div class="breakdown-stat' + cls + '">' +
        '<span class="breakdown-stat__label">' + t(s.label_key) + '</span>' +
        '<span class="breakdown-stat__formula">' + formulaStr + '</span>' +
        '<span class="breakdown-stat__pts">' + ptsStr + ' pts' + capNote + '</span>' +
      '</div>';
    }
    var totalStr = player.total_points >= 0 ? "+" + player.total_points : "" + player.total_points;
    html += '<div class="breakdown-total">' +
      '<span class="breakdown-total__label">' + t("dash.total") + '</span>' +
      '<span class="breakdown-total__pts">' + totalStr + ' pts</span>' +
    '</div>';
    html += '</div>';
    return html;
  }

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

  /* ── Matchday insights: MVP/Flop + Transfer impact ─────────────────────── */

  function renderMatchdayInsights() {
    var mvpFlopEl = document.getElementById("insightsMvpFlop");
    var transferEl = document.getElementById("insightsTransfer");
    if (!mvpFlopEl) return;

    var breakdown = _breakdownByMd[_selectedMd];
    if (!breakdown || !breakdown.players || !breakdown.players.length) {
      mvpFlopEl.innerHTML = '<p class="empty-note">' + t("dash.no_data_md") + "</p>";
      if (transferEl) transferEl.innerHTML = "";
      return;
    }

    var players = [];
    for (var i = 0; i < breakdown.players.length; i++) {
      var p = breakdown.players[i];
      if (p.has_stats) players.push(p);
    }

    if (players.length === 0) {
      mvpFlopEl.innerHTML = '<p class="empty-note">' + t("dash.no_data_md") + "</p>";
      if (transferEl) transferEl.innerHTML = "";
      return;
    }

    players.sort(function (a, b) { return b.total_points - a.total_points; });

    var mvp = players[0];
    var flop = players[players.length - 1];

    var mvpHtml = buildInsightCard(mvp, true);
    var flopHtml = buildInsightCard(flop, false);
    mvpFlopEl.innerHTML = mvpHtml + flopHtml;

    /* transfer impact */
    if (transferEl) {
      var transfers = _transfersByMd[_selectedMd];
      if (!transfers || !transfers.length) {
        transferEl.innerHTML = "";
      } else {
        var ptsIn = 0;
        var ptsOut = 0;
        var playerMap = {};
        for (var j = 0; j < breakdown.players.length; j++) {
          playerMap[breakdown.players[j].player_id] = breakdown.players[j].total_points;
        }
        for (var k = 0; k < transfers.length; k++) {
          var xf = transfers[k];
          var inPts = playerMap[xf.player_in_id] || 0;
          var outPts = playerMap[xf.player_out_id] || 0;
          ptsIn += inPts;
          ptsOut += outPts;
        }
        var net = Math.round((ptsIn - ptsOut) * 100) / 100;
        var isPos = net >= 0;
        var barColor = isPos ? "var(--positive)" : "var(--danger)";
        var netStr = isPos ? "+" + net : "" + net;
        var label = t("dash.net_from_transfers", transfers.length);

        var maxAbs = Math.max(Math.abs(ptsIn), Math.abs(ptsOut), 1);
        var inPct = Math.round((ptsIn / maxAbs) * 100);
        var outPct = Math.round((ptsOut / maxAbs) * 100);

        var html = '<div class="insights-transfer__head">' +
          '<span class="insights-transfer__label">' + t("dash.transfer_impact") + "</span>" +
          '<span class="insights-transfer__net" style="color:' + barColor + '">' + netStr + " pts</span>" +
          "</div>";
        html += '<div class="insights-transfer__bar">';
        html += '<div class="insights-transfer__seg insights-transfer__seg--in" style="width:' + inPct + '%;background:var(--positive)"></div>';
        html += '<div class="insights-transfer__seg insights-transfer__seg--out" style="width:' + outPct + '%;background:var(--danger)"></div>';
        html += "</div>";
        html += '<div class="insights-transfer__legend">' +
          '<span class="insights-transfer__leg-item"><span class="legend__swatch" style="background:var(--positive)"></span>' + t("dash.in") + " " + ptsIn + "</span>" +
          '<span class="insights-transfer__leg-item"><span class="legend__swatch" style="background:var(--danger)"></span>' + t("dash.out") + " " + ptsOut + "</span>" +
          '<span class="insights-transfer__leg-item insights-transfer__leg-item--net">' + label + "</span>" +
          "</div>";
        transferEl.innerHTML = html;
      }
    }
  }

  function buildInsightCard(player, isMvp) {
    var seed = encodeURIComponent(player.name).replace(/'/g, "%27");
    var avatarSrc = "https://api.dicebear.com/9.x/micah/svg?seed=" + seed + "&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50";
    var posColor = POS_COLORS[player.position] || "var(--ink)";
    var pts = player.total_points;
    var ptsStr = pts >= 0 ? "+" + pts : "" + pts;
    var cardClass = isMvp ? "insight-card insight-card--mvp" : "insight-card insight-card--flop";
    var badge = isMvp ? t("dash.mvp") : t("dash.flop");

    /* top 2 stats by absolute pts */
    var stats = (player.stat_points || []).slice();
    stats.sort(function (a, b) { return Math.abs(b.pts) - Math.abs(a.pts); });
    var topStats = stats.slice(0, 2);
    var statsHtml = "";
    for (var s = 0; s < topStats.length; s++) {
      var st = topStats[s];
      var stPts = st.pts >= 0 ? "+" + st.pts : "" + st.pts;
      statsHtml += '<span class="insight-card__stat">' + escapeHtml(t(st.label_key)) + " " + stPts + "</span>";
    }

    var html = '<div class="' + cardClass + '">';
    html += '<div class="insight-card__badge">' + escapeHtml(badge) + "</div>";
    html += '<img class="insight-card__avatar" src="' + avatarSrc + '" alt="" loading="lazy">';
    html += '<div class="insight-card__info">';
    html += '<span class="insight-card__name">' + escapeHtml(player.name) + "</span>";
    html += '<span class="insight-card__stats">' + statsHtml + "</span>";
    html += "</div>";
    html += '<span class="insight-card__pts">' + ptsStr + "</span>";
    html += "</div>";
    return html;
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
    renderRoundRank();
    renderLeagueComparison();
    renderPlayerBreakdown();
    renderValueScatter();
    renderDonut();
    renderMatchdayInsights();
    renderTransfers();
  }

  /* ── Public API ────────────────────────────────────────────────────────── */

  async function init() {
    if (_dashboardLoaded) {
      renderAll();
      return;
    }
    if (_dashboardLoadPromise) return _dashboardLoadPromise;

    _dashboardLoadPromise = (async function () {
      Progress.start();
      try {
        const loadState = await loadAll();
        renderAll();
        if (loadState && loadState.matchdays.length > 0) {
          _dashboardLoaded = true;
          loadRoundRanks(loadState.matchdays, loadState.loadVersion);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        Progress.done();
        _dashboardLoadPromise = null;
      }
    })();
    return _dashboardLoadPromise;
  }

  function refresh() {
    return init();
  }

  function invalidate() {
    _dashboardLoaded = false;
  }

  function retranslate() {
    if (_scoredMatchdays.length === 0) return;
    renderAll();
  }

  return { init: init, render: refresh, refresh: refresh, retranslate: retranslate, invalidate: invalidate };
})();


