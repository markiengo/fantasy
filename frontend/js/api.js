/* ============================================================================
   api.js — REST client for the FastAPI backend (/api/*) with a graceful
   mock-data fallback. There is no seed data in the repo yet, so when the
   backend is unreachable (or returns an error) we serve a generated mock
   dataset so the whole UI is reviewable offline.

   API contract: docs/API.md (v2.3). Endpoints live under /api.
   Note: fixtures = GET /matches, scoring = GET /score (singular) — the live
   names, per ui-spec §4. UI-contract §8's /fixtures and /scores are stale.
   ============================================================================ */

const API_BASE = (location.hostname === "127.0.0.1" || location.hostname === "localhost")
  ? "http://127.0.0.1:8000/api"
  : "/api";

const Api = (() => {
  let useMock = false; // trips to true on first backend failure

  async function call(path, opts) {
    if (useMock) throw new Error("mock-mode");
    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch (e) {}
      const err = new Error(detail);
      err.status = res.status;
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
  // (404/400/500 — the backend responded) is propagated so the caller can
  // handle it; it must NOT switch the whole app into mock mode.
  async function withFallback(realFn, mockFn) {
    try {
      return await realFn();
    } catch (e) {
      if (e.status) throw e;                 // backend answered with an error → real
      if (!useMock) {
        useMock = true;
        console.warn("[Api] backend unreachable — using mock data.", e.message);
        if (window.Toast) Toast.show("Backend offline — showing demo data.", "info");
      }
      return mockFn();
    }
  }

  return {
    isMock: () => useMock,
    forceMock: () => { useMock = true; },

    getPlayers: (params = {}) =>
      withFallback(() => call("/players" + qs(params)), () => Mock.getPlayers(params)),
    getTeams: () =>
      withFallback(() => call("/teams"), () => Mock.getTeams()),
    getMatches: (params = {}) =>
      withFallback(() => call("/matches" + qs(params)), () => Mock.getMatches(params)),
    getMatch: (id) =>
      withFallback(() => call("/matches/" + id), () => Mock.getMatch(id)),
    getSquad: (matchday) =>
      withFallback(() => call("/squad" + qs({ matchday })), () => Mock.getSquad(matchday)),
    createSquad: (matchday, player_ids) =>
      withFallback(
        () => call("/squad", { method: "POST", body: JSON.stringify({ matchday, player_ids }) }),
        () => Mock.createSquad(matchday, player_ids)
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
        const base = pos === "FWD" ? 6 : pos === "MID" ? 5 : pos === "DEF" ? 4 : 3.5;
        const price = +(base + ((ti * 3 + j * 7) % 9) * 0.25).toFixed(1);
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
    getSquad(matchday) {
      build();
      if (_squads[matchday]) return clone(_squads[matchday]);
      const err = new Error("Squad not created for this matchday");
      err.status = 404; throw err;
    },
    createSquad(matchday, player_ids) {
      build();
      const players = player_ids.map((id) => _players.find((p) => p.player_id === id)).filter(Boolean);
      const used = players.reduce((s, p) => s + p.base_price, 0);
      const squad = {
        squad_id: 1000 + matchday, matchday,
        budget_used: +used.toFixed(1), budget_remaining: +(50 - used).toFixed(1),
        players: players.map((p) => ({
          player_id: p.player_id, name: p.name, position: p.position,
          team_id: p.team_id, team_name: p.team_name, base_price: p.base_price,
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
    return `<img class="flag ${cls || ""}" src="${src}" alt="" loading="lazy"
      onerror="this.onerror=null;this.classList.add('flag--placeholder');this.removeAttribute('src');" />`;
  }
  return `<span class="flag flag--placeholder ${cls || ""}" title="${team_id || ""}"></span>`;
}
