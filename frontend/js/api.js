const API_BASE = (location.hostname === "127.0.0.1" || location.hostname === "localhost")
  ? "http://127.0.0.1:8000/api"
  : "/api";

const Api = (() => {
  let useMock = false; // trips to true on first backend failure
  let demoToken = sessionStorage.getItem("gaffer_demo_token") || null;

  function announceMode() {
    window.dispatchEvent(new CustomEvent("backend-mode-changed", {
      detail: { isMock: useMock },
    }));
  }

  async function call(path, opts) {
    if (useMock) throw new Error("mock-mode");

    const headers = { "Content-Type": "application/json" };

    if (demoToken) {
      headers["Authorization"] = `Bearer ${demoToken}`;
    } else if (window.getAccessToken) {
      try {
        const token = await window.getAccessToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (e) {
        console.warn("[Api] getAccessToken failed — sending request without token", e);
      }
    }

    const res = await fetch(API_BASE + path, {
      headers,
      ...opts,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch (e) {}
      const err = new Error(detail);
      err.status = res.status;
      // Auth failures are handled by the app shell, not by mock fallback.
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent("auth-unauthorized", { detail: { path } }));
      } else if (res.status === 403) {
        window.dispatchEvent(new CustomEvent("auth-forbidden", { detail: { path, detail } }));
      }
      throw err;
    }
    return res.json();
  }

  function qs(params) {
    const parts = [];
    for (const k in params) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
      }
    }
    return parts.length ? "?" + parts.join("&") : "";
  }

  // Wrap a real call with a mock fallback. Only fall back on genuine
  // connectivity failures (fetch rejects → no err.status). A real HTTP error
  // (401/403/404/400/500 — the backend responded) is propagated so the caller
  // can handle it; it must NOT switch the whole app into mock mode.
  // 401/403 are auth failures handled by the app shell via events dispatched
  // in call(); they propagate as rejections here.
  async function withFallback(realFn, mockFn) {
    try {
      return await realFn();
    } catch (e) {
      // Auth failures (backend reachable, identity/permission problem) are
      // never a reason to switch to demo data. Let them propagate.
      if (e.status === 401 || e.status === 403) throw e;
      // Any other HTTP status means the backend responded — propagate.
      if (e.status) throw e;
      // No status → genuine connectivity failure → demo fallback.
      if (!useMock) {
        useMock = true;
        console.warn("[Api] backend unreachable — using mock data.", e.message);
        if (window.Toast) Toast.show("Backend offline — showing demo data.", "info");
        announceMode();
      }
      return mockFn();
    }
  }

  return {
    isMock: () => useMock,
    isDemo: () => demoToken !== null,
    forceMock: () => { useMock = true; announceMode(); },
    setDemoToken: () => { demoToken = "demo-token"; sessionStorage.setItem("gaffer_demo_token", demoToken); },
    clearDemoToken: () => { demoToken = null; sessionStorage.removeItem("gaffer_demo_token"); },

    getPlayers: (params = {}) =>
      withFallback(() => call("/players" + qs(params)), () => Mock.getPlayers(params)),
    getTeams: () =>
      withFallback(() => call("/teams"), () => Mock.getTeams()),
    getMatches: (params = {}) =>
      withFallback(() => call("/matches" + qs(params)), () => Mock.getMatches(params)),
    getMatch: (id) =>
      withFallback(() => call("/matches/" + id), () => Mock.getMatch(id)),
    getPlayerStats: (params = {}) =>
      withFallback(() => call("/playerstats" + qs(params)), () => Mock.getPlayerStats(params)),
    getSquad: (matchday) =>
      withFallback(() => call("/squad" + qs({ matchday })), () => Mock.getSquad(matchday)),
    createSquad: (matchday, player_ids, captain_player_id) =>
      withFallback(
        () => call("/squad", { method: "POST", body: JSON.stringify({ matchday, player_ids, captain_player_id }) }),
        () => Mock.createSquad(matchday, player_ids, captain_player_id)
      ),
    getTransfers: (matchday) =>
      withFallback(() => call("/transfers" + qs({ matchday })), () => Mock.getTransfers(matchday)),
    createTransfer: (player_in_id, player_out_id, matchday) =>
      withFallback(
        () => call("/transfer", { method: "POST", body: JSON.stringify({ player_in_id, player_out_id, matchday }) }),
        () => Mock.createTransfer(player_in_id, player_out_id, matchday)
      ),
    getScore: (matchday) =>
      withFallback(() => call("/score" + qs({ matchday })), () => Mock.getScore(matchday)),
    updateData: (body = {}) =>
      withFallback(
        () => call("/load-stats", { method: "POST", body: JSON.stringify(body) }),
        () => Mock.updateData(body)
      ),
    getMe: () => call("/me"),
    getTopStats: (limit = 5) =>
      withFallback(() => call("/playerstats/top" + qs({ limit })), () => Mock.getTopStats(limit)),
  };
})();

/* ----------------------------------------------------------------------------
   Mock dataset — generated, not hand-typed. team_id uses 3-letter FIFA codes
   (TEXT pk per schema.sql). flagIso() maps them to ISO-2 for flag images.
   ---------------------------------------------------------------------------- */
const Mock = (() => {
  // [name, fifa3, iso2, group]
  const TEAMS_RAW = [
    ["Mexico", "MEX", "mx", "A"], ["South Africa", "RSA", "za", "A"],
    ["Canada", "CAN", "ca", "B"], ["Switzerland", "SUI", "ch", "B"],
    ["USA", "USA", "us", "C"], ["Scotland", "SCO", "gb-sct", "C"],
    ["Argentina", "ARG", "ar", "D"], ["Australia", "AUS", "au", "D"],
    ["Brazil", "BRA", "br", "E"], ["Morocco", "MAR", "ma", "E"],
    ["France", "FRA", "fr", "F"], ["Japan", "JPN", "jp", "F"],
    ["Spain", "ESP", "es", "G"], ["Korea Republic", "KOR", "kr", "G"],
    ["England", "ENG", "gb-eng", "H"], ["Portugal", "POR", "pt", "H"],
  ];

  const SURNAMES = [
    "Silva", "Santos", "Garcia", "Müller", "Rossi", "Kane", "Diaz", "Nguyen",
    "Tanaka", "Kim", "Lopez", "Costa", "Mbeki", "Dubois", "Ferrari", "Walker",
    "Romero", "Vidal", "Sato", "Park", "Mendes", "Ali", "Novak", "Berg",
    "Haaland", "Foden", "Saka", "Rice", "Yamamoto", "Cho", "Ruiz", "Pereira",
  ];

  const POS_PLAN = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"];

  let _teams = null, _players = null, _matches = null;
  let _squads = {};       // matchday -> squad obj
  let _transfers = [];

  function build() {
    if (_teams) return;
    _teams = TEAMS_RAW.map((t, i) => ({
      team_id: t[1], name: t[0], iso2: t[2], group_stage: t[3],
      fifa_ranking: i + 1, elo_rating: 1900 - i * 12,
    }));

    _players = [];
    let pid = 1;
    _teams.forEach((team, ti) => {
      POS_PLAN.forEach((pos, j) => {
        const surname = SURNAMES[(ti * 5 + j) % SURNAMES.length];
        // price seeded by position + a deterministic wobble — kept within the 0–8M band
        const base = pos === "FWD" ? 5.5 : pos === "MID" ? 4.5 : pos === "DEF" ? 3.5 : 3;
        const price = +(base + ((ti * 3 + j * 7) % 7) * 0.2).toFixed(1);
        _players.push({
          player_id: pid++, name: `${surname}`, position: pos,
          team_id: team.team_id, team_name: team.name, base_price: price,
        });
      });
    });

    // Fixtures: 3 group rounds, then knockout placeholders matching navbar dates.
    _matches = [];
    let mid = 1;
    const dates = { 1: "2026-06-18", 2: "2026-06-22", 3: "2026-06-25" };
    for (let round = 1; round <= 3; round++) {
      for (let g = 0; g < _teams.length; g += 2) {
        _matches.push({
          match_id: mid++, team1_id: _teams[g].team_id, team1_name: _teams[g].name,
          team2_id: _teams[g + 1].team_id, team2_name: _teams[g + 1].name,
          matchday: round, stage: "group_stage", date: dates[round],
        });
      }
    }
    const ko = [
      [4, "round_of_32", "2026-06-29"], [5, "round_of_16", "2026-07-05"],
      [6, "quarter_final", "2026-07-10"], [7, "semi_final", "2026-07-15"],
      [8, "final", "2026-07-19"],
    ];
    ko.forEach(([md, stage, date]) => {
      const n = md <= 5 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        _matches.push({
          match_id: mid++, team1_id: _teams[k * 2].team_id, team1_name: _teams[k * 2].name,
          team2_id: _teams[k * 2 + 1].team_id, team2_name: _teams[k * 2 + 1].name,
          matchday: md, stage, date,
        });
      }
    });
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  return {
    flagIso(team_id) {
      build();
      const t = _teams.find((x) => x.team_id === team_id);
      return t ? t.iso2 : null;
    },
    getPlayers(params = {}) {
      build();
      let out = clone(_players);
      if (params.position) out = out.filter((p) => p.position === params.position);
      if (params.team_id) out = out.filter((p) => p.team_id === params.team_id);
      if (params.max_price) out = out.filter((p) => p.base_price <= params.max_price);
      if (params.name) out = out.filter((p) => p.name.toLowerCase().includes(params.name.toLowerCase()));
      return out;
    },
    getTeams() { build(); return clone(_teams); },
    getMatches(params = {}) {
      build();
      let out = clone(_matches);
      if (params.matchday) out = out.filter((m) => m.matchday === +params.matchday);
      if (params.stage) out = out.filter((m) => m.stage === params.stage);
      return out;
    },
    getMatch(id) { build(); return clone(_matches.find((m) => m.match_id === +id)); },
    getPlayerStats(params = {}) {
      build();
      const out = [];
      const matches = params.match_id
        ? _matches.filter((m) => m.match_id === +params.match_id)
        : _matches;
      for (const match of matches) {
        for (const player of _players) {
          if (params.player_id && player.player_id !== +params.player_id) continue;
          if (player.team_id !== match.team1_id && player.team_id !== match.team2_id) continue;
          out.push({
            stat_id: out.length + 1,
            player_id: player.player_id,
            player_name: player.name,
            match_id: match.match_id,
            goals: player.position === "FWD" ? player.player_id % 2 : 0,
            assists: player.position === "MID" ? player.player_id % 2 : 0,
            minutes_played: 90,
            yellow_cards: 0,
            red_cards: 0,
            clean_sheet: player.position === "GK" || player.position === "DEF" ? 1 : 0,
            score: ((player.player_id * 7 + match.match_id * 3) % 13) - 2,
          });
          if (out.length > 120) return clone(out);
        }
      }
      return clone(out);
    },
    getSquad(matchday) {
      build();
      if (_squads[matchday]) return clone(_squads[matchday]);
      const err = new Error("Squad not created for this matchday");
      err.status = 404; throw err;
    },
    createSquad(matchday, player_ids, captain_player_id) {
      build();
      const players = player_ids.map((id) => _players.find((p) => p.player_id === id)).filter(Boolean);
      const used = players.reduce((s, p) => s + p.base_price, 0);
      const squad = {
        squad_id: 1000 + matchday, matchday,
        budget_used: +used.toFixed(1), budget_remaining: +(50 - used).toFixed(1),
        players: players.map((p) => ({
          player_id: p.player_id, name: p.name, position: p.position,
          team_id: p.team_id, team_name: p.team_name, base_price: p.base_price,
          is_captain: p.player_id === captain_player_id,
        })),
      };
      _squads[matchday] = squad;
      return clone(squad);
    },
    getTransfers(matchday) {
      const out = matchday ? _transfers.filter((t) => t.matchday === +matchday) : _transfers;
      return clone(out);
    },
    createTransfer(inId, outId, matchday) {
      build();
      const pin = _players.find((p) => p.player_id === inId);
      const pout = _players.find((p) => p.player_id === outId);
      const used = _transfers.filter((t) => t.matchday === matchday).length;
      const t = {
        transfer_id: _transfers.length + 1,
        player_in_id: inId, player_in_name: pin ? pin.name : "?",
        player_out_id: outId, player_out_name: pout ? pout.name : "?",
        matchday, transfers_used: used + 1, transfers_remaining: 5 - (used + 1),
        budget_remaining: _squads[matchday] ? _squads[matchday].budget_remaining : 50,
      };
      _transfers.push(t);
      // reflect swap in stored squad
      const sq = _squads[matchday];
      if (sq) {
        sq.players = sq.players.filter((p) => p.player_id !== outId);
        if (pin) sq.players.push({ player_id: pin.player_id, name: pin.name, position: pin.position, team_id: pin.team_id, team_name: pin.team_name, base_price: pin.base_price });
        const u = sq.players.reduce((s, p) => s + p.base_price, 0);
        sq.budget_used = +u.toFixed(1); sq.budget_remaining = +(50 - u).toFixed(1);
      }
      return clone(t);
    },
    getScore(matchday) {
      build();
      // Deterministic pseudo-scores for any saved squad; otherwise demo on md 1.
      const ref = _squads[matchday] || _squads[1];
      if (matchday) {
        const sq = _squads[matchday];
        if (!sq) { const e = new Error("No squad/stats for this matchday"); e.status = 404; throw e; }
        return {
          matchday,
          breakdown: sq.players.map((p, i) => ({
            player_id: p.player_id, player_name: p.name, position: p.position,
            score: ((p.player_id * 7 + i * 3) % 13) - 2,
          })),
        };
      }
      // cumulative
      const by = [];
      Object.keys(_squads).forEach((md) => {
        const sq = _squads[md];
        const total = sq.players.reduce((s, p, i) => s + (((p.player_id * 7 + i * 3) % 13) - 2), 0);
        by.push({ matchday: +md, score: total });
      });
      return { by_matchday: by.sort((a, b) => a.matchday - b.matchday) };
    },
    updateData() {
      build();
      return {
        dates: [],
        matches_seen: _matches.length,
        matches_completed: 0,
        matches_updated: 0,
        inserted: 0,
        skipped_existing: 0,
        skipped_unmapped_player: 0,
        skipped_unmapped_match: 0,
        errors: 0,
        errors_detail: [],
        mock: true,
      };
    },
    getTopStats(limit = 5) {
      build();
      const stats = _players.map((p) => {
        const playerStats = Mock.getPlayerStats({ player_id: p.player_id });
        let goals = 0, assists = 0, minutes = 0, cleanSheet = 0, yc = 0, rc = 0, score = 0;
        for (const s of playerStats) {
          goals += s.goals || 0;
          assists += s.assists || 0;
          minutes += s.minutes_played || 0;
          cleanSheet += s.clean_sheet || 0;
          yc += s.yellow_cards || 0;
          rc += s.red_cards || 0;
          score += s.score || 0;
        }
        return {
          player_id: p.player_id, name: p.name, position: p.position,
          team_name: p.team_name,
          total_goals: goals, total_assists: assists,
          total_goal_involvements: goals + assists, total_minutes: minutes,
          total_clean_sheets: cleanSheet, total_yellow_cards: yc,
          total_red_cards: rc, total_score: score,
        };
      });
      const top = (key, extra) => {
        const sorted = stats.slice().sort((a, b) => b[key] - a[key]).slice(0, limit);
        return sorted.map((r) => ({
          player_id: r.player_id, name: r.name, position: r.position,
          team_name: r.team_name, value: r[key], ...extra(r),
        }));
      };
      return {
        top_fantasy_score: top("total_score", () => ({})),
        top_scorers: top("total_goals", () => ({})),
        top_assists: top("total_assists", () => ({})),
        top_goal_involvements: top("total_goal_involvements", () => ({})),
        top_clean_sheets: top("total_clean_sheets", () => ({})),
        top_cards: stats
          .slice()
          .sort((a, b) => (b.total_yellow_cards + b.total_red_cards) - (a.total_yellow_cards + a.total_red_cards))
          .slice(0, limit)
          .map((r) => ({
            player_id: r.player_id, name: r.name, position: r.position,
            team_name: r.team_name,
            value: r.total_yellow_cards + r.total_red_cards,
            yellow_cards: r.total_yellow_cards, red_cards: r.total_red_cards,
          })),
      };
    },
  };
})();

/* Flag helper used across screens — maps team_id (3-letter FIFA code, the live
   backend's team.team_id format) -> ISO-2 for flagcdn. Covers all 48 WC26
   nations; unknown codes fall back to a placeholder badge. */
const FIFA_TO_ISO = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BIH: "ba", BRA: "br",
  CAN: "ca", CIV: "ci", COD: "cd", COL: "co", CPV: "cv", CRO: "hr", CUW: "cw",
  CZE: "cz", ECU: "ec", EGY: "eg", ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de",
  GHA: "gh", HAI: "ht", IRN: "ir", IRQ: "iq", JOR: "jo", JPN: "jp", KOR: "kr",
  KSA: "sa", MAR: "ma", MEX: "mx", NED: "nl", NOR: "no", NZL: "nz", PAN: "pa",
  PAR: "py", POR: "pt", QAT: "qa", RSA: "za", SCO: "gb-sct", SEN: "sn", SUI: "ch",
  SWE: "se", TUN: "tn", TUR: "tr", URU: "uy", USA: "us", UZB: "uz",
  WAL: "gb-wls", NIR: "gb-nir", IRL: "ie", ITA: "it",
};
function flagSrc(team_id) {
  const iso = FIFA_TO_ISO[team_id] || (window.Mock && Mock.flagIso ? Mock.flagIso(team_id) : null);
  return iso ? `https://flagcdn.com/w40/${iso}.png` : null;
}
function flagImg(team_id, cls) {
  const src = flagSrc(team_id);
  if (src) {
    return `<span class="flag ${cls || ""}" style="background-image:url('${src}')" title="${team_id || ""}"></span>`;
  }
  return `<span class="flag flag--placeholder ${cls || ""}" title="${team_id || ""}"></span>`;
}
