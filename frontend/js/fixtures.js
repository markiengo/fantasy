const Fixtures = (() => {
  let round = 1;
  let activeTab = "standings";
  const maxRound = 8;

  const stageLabel = {
    group_stage: (md) => `Round ${md}`,
    round_of_32: () => "Round of 32",
    round_of_16: () => "Round of 16",
    quarter_final: () => "Quarterfinals",
    semi_final: () => "Semifinals",
    final: () => "Final",
  };

  const bracketStages = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"];

  function fmtDate(iso) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const parts = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return `${days[dt.getUTCDay()]} ${parts[2]} ${months[parts[1] - 1]}`;
  }

  function kickoff(match) {
    if (match.kickoff) {
      const date = new Date(match.kickoff);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
    }
    const slots = ["18:00", "21:00", "00:00", "03:00"];
    return slots[match.match_id % slots.length];
  }

  function labelForStage(stage, md) {
    const fn = stageLabel[stage] || stageLabel.group_stage;
    return fn(md);
  }

  function renderOverview(matches) {
    const meta = currentRoundMeta(round);
    const stage = matches.length ? matches[0].stage : (meta ? meta.stage : "group_stage");
    const roundLabel = document.getElementById("fxRoundLabel");
    const countLabel = document.getElementById("tournamentMatchCount");
    const stageText = document.getElementById("tournamentStageLabel");
    if (roundLabel) roundLabel.textContent = labelForStage(stage, round);
    if (countLabel) countLabel.textContent = String(matches.length);
    if (stageText) stageText.textContent = stage === "group_stage" ? "Group stage" : labelForStage(stage, round);
  }

  function emptyStanding(team) {
    return {
      team_id: team.team_id,
      name: team.name,
      group: team.group_stage || "-",
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      points: 0,
      form: [],
      next: null,
    };
  }

  function ensureStanding(table, team) {
    if (!table[team.team_id]) {
      table[team.team_id] = emptyStanding(team);
    }
    return table[team.team_id];
  }

  function computeStandings() {
    const byId = {};
    for (const team of State.teams) {
      byId[team.team_id] = team;
    }

    const table = {};
    for (const team of State.teams) {
      ensureStanding(table, team);
    }

    for (const match of State.fixtures) {
      const t1 = byId[match.team1_id];
      const t2 = byId[match.team2_id];
      if (!t1 || !t2) continue;
      const s1 = ensureStanding(table, t1);
      const s2 = ensureStanding(table, t2);

      if (match.team1_score == null || match.team2_score == null) {
        if (!s1.next) s1.next = match.team2_id;
        if (!s2.next) s2.next = match.team1_id;
        continue;
      }

      s1.played = s1.played + 1;
      s2.played = s2.played + 1;
      s1.gf = s1.gf + Number(match.team1_score);
      s1.ga = s1.ga + Number(match.team2_score);
      s2.gf = s2.gf + Number(match.team2_score);
      s2.ga = s2.ga + Number(match.team1_score);

      if (match.team1_score > match.team2_score) {
        s1.wins = s1.wins + 1;
        s2.losses = s2.losses + 1;
        s1.points = s1.points + 3;
        s1.form.push("W");
        s2.form.push("L");
      } else if (match.team1_score < match.team2_score) {
        s2.wins = s2.wins + 1;
        s1.losses = s1.losses + 1;
        s2.points = s2.points + 3;
        s2.form.push("W");
        s1.form.push("L");
      } else {
        s1.draws = s1.draws + 1;
        s2.draws = s2.draws + 1;
        s1.points = s1.points + 1;
        s2.points = s2.points + 1;
        s1.form.push("D");
        s2.form.push("D");
      }
    }

    const groups = {};
    for (const teamId in table) {
      const row = table[teamId];
      if (!groups[row.group]) groups[row.group] = [];
      groups[row.group].push(row);
    }
    return groups;
  }

  function sortStandings(rows) {
    rows.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
  }

  function formBadgesHtml(row) {
    let html = "";
    const recent = row.form.slice(-3);
    for (const item of recent) {
      html += `<i class="form-badge form-badge--${item.toLowerCase()}">${item}</i>`;
    }
    return html || `<span style="color:var(--faint)">-</span>`;
  }

  function nextHtml(row) {
    if (!row.next) return `<span style="color:var(--faint)">-</span>`;
    return flagImg(row.next, "flag--sm");
  }

  function renderGroups() {
    const grid = document.getElementById("groupGrid");
    if (!grid) return;

    if (!State.teams.length) {
      grid.innerHTML = `<p class="empty-note">No group data yet.</p>`;
      return;
    }

    const groups = computeStandings();
    const order = Object.keys(groups).sort();
    let html = "";
    for (const key of order) {
      const rows = groups[key];
      sortStandings(rows);
      let body = "";
      let rank = 1;
      for (const row of rows) {
        const gd = row.gf - row.ga;
        const gdLabel = gd > 0 ? `+${gd}` : String(gd);
        const qual = rank <= 2 ? rank : "";
        const qualAttr = qual ? ` data-qual="${qual}"` : "";
        const qualClass = rank <= 2 ? " is-qualifying" : "";
        body += `<div class="table-row${qualClass}"${qualAttr}>
          <span class="table-row__rank"${qualAttr}><i class="qbar"></i>${rank}</span>
          <span class="table-row__team">${flagImg(row.team_id)}<b>${row.name}</b></span>
          <span>${row.played}</span>
          <span>${row.wins}</span>
          <span>${row.draws}</span>
          <span>${row.losses}</span>
          <span class="dim">${row.gf}-${row.ga}</span>
          <span>${gdLabel}</span>
          <b class="pts">${row.points}</b>
          <span class="form">${formBadgesHtml(row)}</span>
          <span>${nextHtml(row)}</span>
        </div>`;
        rank = rank + 1;
      }
      html += `<section class="group">
        <header class="group__head"><h3>Group ${key}</h3><span class="hr"></span></header>
        <div class="group__cols">
          <span>#</span><span>Team</span><span>PL</span><span>W</span><span>D</span>
          <span>L</span><span>+/-</span><span>GD</span><span>PTS</span><span>Form</span><span>Next</span>
        </div>
        ${body}
      </section>`;
    }
    grid.innerHTML = html;
  }

  function renderFixtures(matches) {
    const list = document.getElementById("fixturesList");
    if (!list) return;

    if (!State.fixtures.length) {
      let html = "";
      for (let i = 0; i < 5; i++) {
        html += `<div class="skeleton" style="height:64px;margin-bottom:8px"></div>`;
      }
      list.innerHTML = html;
      return;
    }

    if (!matches.length) {
      list.innerHTML = `<p class="empty-note">No fixtures for this round yet.</p>`;
      return;
    }

    const byDate = {};
    for (const match of matches) {
      if (!byDate[match.date]) byDate[match.date] = [];
      byDate[match.date].push(match);
    }

    const dates = Object.keys(byDate).sort();
    for (const date of dates) {
      byDate[date].sort((a, b) => {
        const aTime = a.kickoff || "";
        const bTime = b.kickoff || "";
        if (aTime !== bTime) return aTime.localeCompare(bTime);
        return a.match_id - b.match_id;
      });
    }

    let html = "";
    for (const date of dates) {
      html += `<div class="fixtures__daygroup"><div class="fixtures__date">${fmtDate(date)}</div>`;
      for (const match of byDate[date]) {
        html += matchRow(match);
      }
      html += `</div>`;
    }
    list.innerHTML = html;
  }

  function scoreLabel(match, side) {
    const score = side === 1 ? match.team1_score : match.team2_score;
    const penalty = side === 1 ? match.team1_penalty_score : match.team2_penalty_score;
    if (score == null) return "";
    let label = String(score);
    if (penalty != null) label += ` (${penalty})`;
    return label;
  }

  function shortName(name) {
    if (!name) return "TBD";
    const shorts = {
      "South Africa": "S.Africa", "South Korea": "S.Korea",
      "Korea Republic": "Korea", "Netherlands": "Dutch",
      "Switzerland": "Switz.", "Australia": "Aussie",
      "Argentina": "Argent.", "Paraguay": "Parag.",
      "Colombia": "Colom.", "Morocco": "Moroc.",
      "Germany": "Ger.", "Portugal": "Port.",
      "England": "Eng.", "Scotland": "Scot.",
      "Spain": "Spa.", "France": "Fra.",
      "Mexico": "Mex.", "Canada": "Can.",
      "Japan": "Jpn.", "Brazil": "Bra.",
      "Belgium": "Bel.", "Croatia": "Cro.",
      "Ecuador": "Ecu.", "Senegal": "Sen.",
      "Norway": "Nor.", "Sweden": "Swe.",
      "Uruguay": "Uru.", "Iran": "Irn.",
      "Tunisia": "Tun.", "Algeria": "Alger.",
      "Nigeria": "Nig.", "Ghana": "Gha.",
      "Panama": "Pan.", "Jordan": "Jor.",
      "Uzbekistan": "Uzb.", "Iraq": "Irq.",
      "Saudi Arabia": "S.Arab.", "Egypt": "Egy.",
      "New Zealand": "N.Z.", "Ivory Coast": "Ivory",
      "Cape Verde": "C.Verde", "Curacao": "Curac.",
      "Bosnia & H.": "Bosnia", "Haiti": "Haiti",
      "Qatar": "Qat.", "Costa Rica": "C.Rica",
      "DR Congo": "DRC", "Czechia": "Czech.",
      "United States": "USA", "Türkiye": "Tur.",
      "Turkiye": "Tur.", "Turkey": "Tur.",
    };
    return shorts[name] || name;
  }

  function matchWinner(match) {
    if (match.team1_score == null || match.team2_score == null) return 0;
    if (match.team1_score > match.team2_score) return 1;
    if (match.team1_score < match.team2_score) return 2;
    if (match.team1_penalty_score != null && match.team2_penalty_score != null) {
      if (match.team1_penalty_score > match.team2_penalty_score) return 1;
      if (match.team1_penalty_score < match.team2_penalty_score) return 2;
    }
    return 0;
  }

  function matchRow(match) {
    const hasScore = match.team1_score != null && match.team2_score != null;
    const t1Name = shortName(match.team1_name);
    const t2Name = shortName(match.team2_name);

    const center = hasScore
      ? `<b class="score">${scoreLabel(match, 1)} – ${scoreLabel(match, 2)}</b>`
      : `<b class="time">${kickoff(match)}</b>`;

    const winner = matchWinner(match);
    const t1Class = winner === 1 ? " fixture-row__team--win" : winner === 2 ? " fixture-row__team--lose" : "";
    const t2Class = winner === 2 ? " fixture-row__team--win" : winner === 1 ? " fixture-row__team--lose" : "";

    return `<div class="fixture-row">
      <span class="fixture-row__team fixture-row__team--home${t1Class}">
        <b>${t1Name}</b>${flagImg(match.team1_id)}
      </span>
      <span class="fixture-row__mid">${center}</span>
      <span class="fixture-row__team${t2Class}">
        ${flagImg(match.team2_id)}<b>${t2Name}</b>
      </span>
    </div>`;
  }

  function renderKnockout() {
    const root = document.getElementById("knockoutBracket");
    if (!root) return;

    const COL_W = 150, GAP = 56, HEIGHT = 1400, TOP = 26;
    const EXPECTED_NODES = { round_of_32: 16, round_of_16: 8, quarter_final: 4, semi_final: 2, final: 1 };
    const ROUND_NAMES = {
      round_of_32: "ROUND OF 32",
      round_of_16: "ROUND OF 16",
      quarter_final: "QUARTERFINALS",
      semi_final: "SEMIFINALS",
      final: "FINAL",
    };

    // Build round data
    const roundData = [];
    for (const stage of bracketStages) {
      const matches = [];
      for (const match of State.fixtures) {
        if (match.stage === stage) matches.push(match);
      }
      matches.sort((a, b) => (a.bracket_order ?? 999) - (b.bracket_order ?? 999) || a.match_id - b.match_id);
      const expectedN = EXPECTED_NODES[stage] || 1;
      roundData.push({ stage, matches, n: Math.max(expectedN, matches.length) });
    }

    // Compute Y center for node i of n in a column
    function nodeY(i, n) {
      return TOP + (HEIGHT - TOP) * (i + 0.5) / n;
    }

    // Generate SVG connector paths
    let paths = "";
    for (let k = 0; k < roundData.length - 1; k++) {
      const src = roundData[k];
      const dst = roundData[k + 1];
      const rightEdge = k * (COL_W + GAP) + COL_W;
      const midX = rightEdge + GAP / 2;
      const dstLeft = (k + 1) * (COL_W + GAP);
      for (let j = 0; j < dst.n; j++) {
        const y1 = nodeY(j * 2, src.n);
        const y2 = nodeY(j * 2 + 1, src.n);
        const yMid = (y1 + y2) / 2;
        paths += `<path d="M ${rightEdge} ${y1} H ${midX} V ${y2} H ${rightEdge} M ${midX} ${yMid} H ${dstLeft}" />`;
      }
    }

    const totalW = bracketStages.length * COL_W + (bracketStages.length - 1) * GAP + 80;

    // Build rounds HTML — nodes are absolutely positioned at nodeY() so SVG lines align
    let roundsHtml = "";
    for (let k = 0; k < roundData.length; k++) {
      const { stage, matches, n } = roundData[k];
      const isFinalRound = stage === "final";
      let nodesHtml = "";

      for (let i = 0; i < n; i++) {
        const y = nodeY(i, n);
        const match = matches[i];
        let inner;

        if (match) {
          const t1 = shortName(match.team1_name) || (match.team1_id || "TBD");
          const t2 = shortName(match.team2_name) || (match.team2_id || "TBD");
          const hasScore = match.team1_score != null && match.team2_score != null;
          let t1Score = "", t2Score = "";
          let t1Win = "", t2Win = "";
          if (hasScore) {
            t1Score = scoreLabel(match, 1);
            t2Score = scoreLabel(match, 2);
            const winner = matchWinner(match);
            if (winner === 1) {
              t1Win = " bracket-node__slot--win";
              t2Win = " bracket-node__slot--lose";
            } else if (winner === 2) {
              t1Win = " bracket-node__slot--lose";
              t2Win = " bracket-node__slot--win";
            }
          }
          inner = `<div class="bracket-node__slot${t1Win}">${flagImg(match.team1_id)}<b>${t1}</b>${t1Score ? `<span class="bracket-node__score">${t1Score}</span>` : ""}</div>
            <div class="bracket-node__slot${t2Win}">${flagImg(match.team2_id)}<b>${t2}</b>${t2Score ? `<span class="bracket-node__score">${t2Score}</span>` : ""}</div>`;
        } else {
          inner = `<div class="bracket-node__slot"><span class="shield"></span><b>TBD</b></div>
            <div class="bracket-node__slot"><span class="shield"></span><b>TBD</b></div>`;
        }

        nodesHtml += `<div class="bracket-node${isFinalRound ? " bracket-node--final" : ""}" style="top:${y - TOP}px">${inner}</div>`;
      }

      roundsHtml += `<div class="bracket-round">
        <p class="bracket-round__name">${ROUND_NAMES[stage] || stage.toUpperCase()}</p>
        <div class="bracket-round__nodes">${nodesHtml}</div>
      </div>`;
    }

    root.innerHTML = `<div class="bracket__scroll">
      <div class="bracket" style="width:${totalW}px;height:${HEIGHT}px">
        <svg class="bracket__connectors" viewBox="0 0 ${totalW} ${HEIGHT}" aria-hidden="true">${paths}</svg>
        ${roundsHtml}
        <div class="bracket__champion">
          <span class="trophy">🏆</span><b>CHAMPION</b>
        </div>
      </div>
    </div>`;
  }

  function render() {
    const matches = [];
    for (const match of State.fixtures) {
      if (match.matchday === round) matches.push(match);
    }
    renderOverview(matches);
    renderGroups();
    renderFixtures(matches);
    renderKnockout();
  }

  function setTab(name) {
    activeTab = name;
    document.querySelectorAll(".fixture-tab").forEach((tab) => {
      const active = tab.dataset.fixtureTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.getElementById("fixturePaneStandings").classList.toggle("is-active", name === "standings");
    document.getElementById("fixturePaneKnockout").classList.toggle("is-active", name === "knockout");
  }

  function init() {
    document.getElementById("fxPrev").addEventListener("click", () => {
      if (round > 1) {
        round = round - 1;
        render();
      }
    });
    document.getElementById("fxNext").addEventListener("click", () => {
      if (round < maxRound) {
        round = round + 1;
        render();
      }
    });
    document.querySelectorAll(".fixture-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        setTab(tab.dataset.fixtureTab);
      });
    });
    setTab(activeTab);
  }

  return {
    init,
    render,
    setRound: (value) => { round = value; },
  };
})();
