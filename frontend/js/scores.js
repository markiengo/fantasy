const Scores = (() => {
  const posColor = {
    GK: "var(--pos-GK)",
    DEF: "var(--pos-DEF)",
    MID: "var(--pos-MID)",
    FWD: "var(--pos-FWD)",
  };

  function skeletonBars(n) {
    const heights = [55, 80, 40, 70, 60];
    let html = `<div class="bars">`;
    for (let i = 0; i < n; i++) {
      const h = heights[i % heights.length];
      html += `<div class="bar"><div class="skeleton" style="width:100%;max-width:46px;height:${h}%;border-radius:var(--r-sm) var(--r-sm) 0 0"></div></div>`;
    }
    html += `</div>`;
    return html;
  }

  function skeletonTableRows(n) {
    let html = "";
    for (let i = 0; i < n; i++) {
      html += `<li style="list-style:none;padding:8px 4px;border-bottom:1px solid var(--stroke-soft)"><div class="skeleton" style="height:18px;border-radius:6px"></div></li>`;
    }
    return html;
  }

  function scoreOf(row) {
    return Number(row.score ?? row.squad_score ?? 0);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderSparkline(rows) {
    const root = document.getElementById("scoreTrend");
    if (!root) return;
    if (!rows.length) {
      root.innerHTML = `<span class="muted">No trend yet.</span>`;
      return;
    }
    let max = 1;
    for (const row of rows) {
      const value = Math.abs(scoreOf(row));
      if (value > max) max = value;
    }
    let html = "";
    for (const row of rows) {
      const value = scoreOf(row);
      const pct = Math.max(8, Math.abs(value) / max * 100);
      const meta = _roundMeta.find((r) => r.matchday === row.matchday);
      const lbl = meta ? meta.label : `R${row.matchday}`;
      html += `<span class="sparkline__bar" title="${lbl}: ${value}" style="height:${pct}%"></span>`;
    }
    root.innerHTML = html;
  }

  function matchdayByMatchId() {
    const out = {};
    for (const match of State.fixtures) {
      out[match.match_id] = match.matchday;
    }
    return out;
  }

  function sumPlayerScoreForMatchday(stats, playerId, matchday, matchdayById) {
    let total = 0;
    for (const stat of stats) {
      if (stat.player_id !== playerId) continue;
      if (matchdayById[stat.match_id] !== matchday) continue;
      total = total + scoreOf(stat);
    }
    return total;
  }

  function playerAvatar(name) {
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50`;
  }

  function renderTransferHistory(history) {
    const root = document.getElementById("transferHistory");
    if (!root) return;
    if (!history.length) {
      root.innerHTML = `<p class="empty-note">No transfers this matchday.</p>`;
      return;
    }
    let html = "";
    for (const item of history) {
      html += `<div class="xfer-card">
        <div class="xfer-card__row xfer-card__row--out">
          <span class="xfer-arrow xfer-arrow--out">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14V4M5 9l5-5 5 5"/><line x1="4" y1="17" x2="16" y2="17"/></svg>
          </span>
          <span class="avatar avatar--32" style="background-image:url('${playerAvatar(item.player_out_name)}')"></span>
          <span class="xfer-name">${item.player_out_name}</span>
          <span class="xfer-badge xfer-badge--out">OUT</span>
        </div>
        <div class="xfer-card__row xfer-card__row--in">
          <span class="xfer-arrow xfer-arrow--in">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6v10M5 11l5 5 5-5"/><line x1="4" y1="3" x2="16" y2="3"/></svg>
          </span>
          <span class="avatar avatar--32" style="background-image:url('${playerAvatar(item.player_in_name)}')"></span>
          <span class="xfer-name">${item.player_in_name}</span>
          <span class="xfer-badge xfer-badge--in">IN</span>
        </div>
      </div>`;
    }
    root.innerHTML = html;
  }

  function renderParticipation(stats, matchday, squadPlayers) {
    const root = document.getElementById("participationList");
    if (!root) return;
    const players = (squadPlayers || []).slice(0, 11);
    if (!players.length) {
      root.innerHTML = `<p class="empty-note">Save or load a squad to see participation.</p>`;
      return;
    }
    const byMatch = matchdayByMatchId();

    let hasMatchdayStats = false;
    for (const stat of stats) {
      if (byMatch[stat.match_id] === matchday) { hasMatchdayStats = true; break; }
    }
    if (!hasMatchdayStats) {
      root.innerHTML = `<p class="empty-note">Matches not played yet — data not available.</p>`;
      return;
    }

    const maxMinutes = 90;
    let html = "";
    for (const player of players) {
      let minutes = 0;
      for (const stat of stats) {
        if (stat.player_id !== player.player_id) continue;
        if (byMatch[stat.match_id] !== matchday) continue;
        minutes = minutes + Number(stat.minutes_played || 0);
      }
      const pct = Math.min(100, Math.round((minutes / maxMinutes) * 100));
      html += `<div class="participation__row">
        <span class="name">${player.name}</span>
        <div class="bar"><i class="bar__fill" style="width:${pct}%"></i></div>
        <b>${pct}%</b>
      </div>`;
    }
    root.innerHTML = html;
  }

  let _selectedMatchday = null;

  function buildMatchdayNav(allMatchdays, scoredSet) {
    const nav = document.getElementById("dashMatchdayNav");
    if (!nav) return;
    if (!allMatchdays.length) { nav.hidden = true; return; }
    nav.hidden = false;
    let html = "";
    for (const md of allMatchdays) {
      const active = md === _selectedMatchday;
      const hasData = scoredSet && scoredSet.has(md);
      const meta = _roundMeta.find((r) => r.matchday === md);
      const label = meta ? meta.label : `R${md}`;
      html += `<button class="dash-md-tab${active ? " is-active" : ""}${!hasData ? " dash-md-tab--empty" : ""}" type="button" data-md="${md}">${label}</button>`;
    }
    nav.innerHTML = html;
    nav.querySelectorAll(".dash-md-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        _selectedMatchday = Number(btn.dataset.md);
        renderMatchdayDetail(_selectedMatchday, scoredSet);
        nav.querySelectorAll(".dash-md-tab").forEach(b => b.classList.toggle("is-active", b === btn));
      });
    });
  }

  async function renderMatchdayDetail(matchday, scoredSet) {
    document.getElementById("contribBody").innerHTML = skeletonTableRows(5);
    const valueElInit = document.getElementById("valueRows");
    if (valueElInit) valueElInit.innerHTML = `<div class="skeleton" style="height:120px;border-radius:var(--r-sm)"></div>`;
    const historyRoot = document.getElementById("transferHistory");
    if (historyRoot) historyRoot.innerHTML = `<div class="skeleton" style="height:80px;border-radius:var(--r-sm)"></div>`;
    const participationRoot = document.getElementById("participationList");
    if (participationRoot) participationRoot.innerHTML = `<div class="skeleton" style="height:80px;border-radius:var(--r-sm)"></div>`;

    let breakdown = [];
    let matchdaySquad = null;
    try {
      const [md, sq] = await Promise.all([
        Api.getScore(matchday).catch(() => ({ breakdown: [] })),
        Api.getSquad(matchday).catch(() => null),
      ]);
      breakdown = md.breakdown || [];
      matchdaySquad = sq;
    } catch (e) {
      breakdown = [];
    }

    const byPos = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const item of breakdown) {
      byPos[item.position] = byPos[item.position] + Math.max(0, scoreOf(item));
    }
    const donutData = [];
    for (const pos of POSITIONS) {
      if (byPos[pos] > 0) {
        donutData.push({ label: pos, value: byPos[pos], color: posColor[pos] });
      }
    }
    Charts.donut(
      document.getElementById("scoreDonut"),
      document.getElementById("donutCenter"),
      document.getElementById("donutLegend"),
      donutData
    );

    const priceOf = {};
    if (matchdaySquad) {
      for (const player of matchdaySquad.players) {
        priceOf[player.player_id] = player.base_price;
      }
    }

    const noData = !breakdown.length;
    const tbody = document.getElementById("contribBody");
    if (noData) {
      tbody.innerHTML = `<li class="empty-note" style="padding:12px 0;list-style:none;color:var(--muted)">Matches not played yet — data not available.</li>`;
    } else {
      const sorted = breakdown.slice().sort((a, b) => scoreOf(b) - scoreOf(a));
      let html = "";
      let rank = 1;
      for (const item of sorted) {
        const points = scoreOf(item);
        const seed = encodeURIComponent(item.player_name);
        const avatarSrc = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50`;
        const capBadge = item.is_captain ? `<span class="scorer-cap">(C)</span>` : "";
        const ptsDisplay = item.is_captain ? `${points} <span class="scorer-x2">(x2)</span>` : `${points}`;
        html += `<li>
          <span class="rank">${rank}</span>
          <span class="avatar avatar--30" style="background-image:url('${avatarSrc}')"></span>
          <span class="scorer-name">${item.player_name} ${capBadge}</span>
          <i class="pos pos--${item.position.toLowerCase()}">${item.position}</i>
          <b class="scorer-pts${points < 0 ? " scorer-pts--neg" : ""}">${ptsDisplay}</b>
        </li>`;
        rank = rank + 1;
      }
      tbody.innerHTML = html;
    }

    const valueEl = document.getElementById("valueRows");
    if (valueEl) {
      if (noData) {
        valueEl.innerHTML = `<p class="empty-note">Matches not played yet — data not available.</p>`;
      } else {
        const rows = [];
        for (const item of breakdown) {
          const price = priceOf[item.player_id];
          if (price == null || price <= 0) continue;
          const points = scoreOf(item);
          const ratio = points / price;
          rows.push({ name: item.player_name, position: item.position, price, points, ratio });
        }
        rows.sort((a, b) => b.ratio - a.ratio);
        let maxRatio = 1;
        for (const row of rows) { if (row.ratio > maxRatio) maxRatio = row.ratio; }
        let html = "";
        for (const row of rows) {
          const barPct = maxRatio > 0 ? Math.max(2, (row.ratio / maxRatio) * 100) : 2;
          const ratioLabel = row.ratio >= 0 ? `+${row.ratio.toFixed(1)}/m` : `${row.ratio.toFixed(1)}/m`;
          const barColor = row.ratio < 0 ? "var(--danger)" : "var(--accent)";
          html += `<div class="value-row">
            <span class="value-name" style="color:${posColor[row.position]}">${row.name}</span>
            <span class="value-price">$${row.price.toFixed(1)}m</span>
            <div class="value-bar-wrap"><div class="value-bar" style="width:${barPct}%;background:${barColor}"></div></div>
            <span class="value-pts ${row.points < 0 ? "contrib__score--neg" : ""}">${row.points} pts</span>
            <span class="value-ratio">${ratioLabel}</span>
          </div>`;
        }
        valueEl.innerHTML = html || `<p class="empty-note">No priced players in squad.</p>`;
      }
    }

    let playerStats = [];
    let transfers = [];
    try { playerStats = await Api.getPlayerStats(); } catch (e) { playerStats = []; }
    try { transfers = await Api.getTransfers(matchday); } catch (e) { transfers = []; }
    renderTransferHistory(transfers);
    renderParticipation(playerStats, matchday, matchdaySquad ? matchdaySquad.players : null);
  }

  async function render() {
    setText("scoreTotal", "-");
    setText("rankValue", "1 / 1");
    setText("percentileValue", "100%");
    setText("budgetRemainingDash", `$${State.budgetRemaining().toFixed(1)}m`);
    document.getElementById("scoreBars").innerHTML = skeletonBars(5);
    document.getElementById("scoreDonut").innerHTML = '';
    document.getElementById("scoreDonut").style.background = "rgba(255,255,255,.06)";
    setText("donutCenter", "");
    document.getElementById("donutLegend").innerHTML = `<div class="skeleton" style="height:60px;border-radius:var(--r-sm)"></div>`;
    document.getElementById("contribBody").innerHTML = skeletonTableRows(5);
    const valueElInit = document.getElementById("valueRows");
    if (valueElInit) valueElInit.innerHTML = `<div class="skeleton" style="height:120px;border-radius:var(--r-sm)"></div>`;
    const historyRoot = document.getElementById("transferHistory");
    if (historyRoot) historyRoot.innerHTML = `<div class="skeleton" style="height:120px;border-radius:var(--r-sm)"></div>`;
    const participationRoot = document.getElementById("participationList");
    if (participationRoot) participationRoot.innerHTML = `<div class="skeleton" style="height:120px;border-radius:var(--r-sm)"></div>`;

    let cumulative = { by_matchday: [] };
    try {
      cumulative = await Api.getScore();
    } catch (e) {
      cumulative = { by_matchday: [] };
    }
    const by = cumulative.by_matchday || [];

    let total = 0;
    const barData = [];
    for (const row of by) {
      const value = scoreOf(row);
      total = total + value;
      const meta = _roundMeta.find((r) => r.matchday === row.matchday);
      const label = meta ? meta.label : `R${row.matchday}`;
      barData.push({ label, value });
    }
    setText("scoreTotal", total);
    Charts.bars(document.getElementById("scoreBars"), barData);
    renderSparkline(by);

    // Build nav from ALL fixture matchdays so every round appears even before data arrives
    const allMdSet = new Set();
    for (const fix of State.fixtures) allMdSet.add(fix.matchday);
    const allMatchdays = Array.from(allMdSet).sort((a, b) => a - b);

    const scoredSet = new Set();
    for (const row of by) scoredSet.add(row.matchday);

    // Default to latest scored matchday; fall back to first known or currentMatchday
    if (by.length) {
      _selectedMatchday = by[by.length - 1].matchday;
    } else if (allMatchdays.length) {
      _selectedMatchday = allMatchdays[0];
    } else {
      _selectedMatchday = State.currentMatchday;
    }
    buildMatchdayNav(allMatchdays, scoredSet);
    await renderMatchdayDetail(_selectedMatchday, scoredSet);
  }

  return { render };
})();
