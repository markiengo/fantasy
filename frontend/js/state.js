/* ============================================================================
   state.js — global app state, persistence, and squad-rule helpers.
   Mirrors app/core/validation.py rules client-side so the UI can give instant
   feedback (the backend remains the source of truth on save/transfer).
   ============================================================================ */

const FORMATIONS = {
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
};
const POSITIONS = ["GK", "DEF", "MID", "FWD"];

// Rule constants (GR-01..GR-04) — mirror validation.py
const RULES = { budgetCap: 50, squadSize: 11, sameCountryMax: 3, maxTransfers: 5 };

const STORAGE_KEY = "wcf2026";

const State = {
  currentMatchday: 1,
  players: [],
  teams: [],
  currentSquad: { matchday: 1, formation: "4-3-3", players: [] },
  fixtures: [],
  scores: null,
  _subs: [],

  // My Team screen mode: "build" (no saved squad → create), "view" (saved, read-only),
  // "transfer" (saved, editing on the pitch → each swap becomes a POST /transfer).
  mode: "build",
  squadSaved: false,      // does the backend have a squad for currentMatchday?
  transfersUsed: 0,       // transfers already made this matchday (fetched from backend)
  lastAddedId: null,      // pid just added → its pitch card pops once (cleared after render)

  /* --- persistence (UI-contract §6: draft squad + selected matchday) --- */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentMatchday: this.currentMatchday,
        currentSquad: this.currentSquad,
      }));
    } catch (e) { /* storage unavailable — non-fatal */ }
  },
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.currentMatchday) this.currentMatchday = data.currentMatchday;
      if (data.currentSquad) this.currentSquad = data.currentSquad;
    } catch (e) { /* ignore corrupt state */ }
  },

  /* --- baseline snapshot (for "Cancel changes") --- */
  _baseline: null,
  setBaseline() { this._baseline = JSON.stringify({ f: this.currentSquad.formation, p: this.currentSquad.players }); },
  restoreBaseline() {
    if (!this._baseline) { this.currentSquad.players = []; this.emit(); return; }
    const b = JSON.parse(this._baseline);
    this.currentSquad.formation = b.f;
    this.currentSquad.players = b.p;
    this.emit();
  },
  isDirty() {
    return this._baseline !== JSON.stringify({ f: this.currentSquad.formation, p: this.currentSquad.players });
  },

  /* --- render bus --- */
  subscribe(fn) { this._subs.push(fn); },
  emit() { this.save(); this._subs.forEach((fn) => fn()); },

  /* --- derived --- */
  budgetUsed() {
    let t = 0;
    for (const p of this.currentSquad.players) t += p.base_price;
    return Math.round(t * 10) / 10;
  },
  budgetRemaining() { return Math.round((RULES.budgetCap - this.budgetUsed()) * 10) / 10; },

  posCounts() {
    const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of this.currentSquad.players) c[p.position]++;
    return c;
  },
  teamCounts() {
    const c = {};
    for (const p of this.currentSquad.players) c[p.team_id] = (c[p.team_id] || 0) + 1;
    return c;
  },
  hasPlayer(id) {
    for (const p of this.currentSquad.players) if (p.player_id === id) return true;
    return false;
  },

  /* --- rule check: why a player can or cannot be added now --- */
  addBlockReason(player) {
    if (this.hasPlayer(player.player_id)) return "Already in squad";
    if (this.currentSquad.players.length >= RULES.squadSize) return "Squad full (11)";
    const need = FORMATIONS[this.currentSquad.formation];
    if (this.posCounts()[player.position] >= need[player.position]) return `No ${player.position} slot left`;
    const tc = this.teamCounts();
    if ((tc[player.team_id] || 0) >= RULES.sameCountryMax) return `Max ${RULES.sameCountryMax} from one team`;
    if (this.budgetUsed() + player.base_price > RULES.budgetCap) return "Over budget";
    return null;
  },
  canAdd(player) { return this.addBlockReason(player) === null; },

  addPlayer(player) {
    if (!this.canAdd(player)) return false;
    this.currentSquad.players.push({
      player_id: player.player_id, name: player.name, position: player.position,
      team_id: player.team_id, team_name: player.team_name, base_price: player.base_price,
    });
    this.lastAddedId = player.player_id;   // squad.js pops just this card on the next render
    this.emit();
    return true;
  },
  removePlayer(id) {
    this.currentSquad.players = this.currentSquad.players.filter((p) => p.player_id !== id);
    this.emit();
  },
  setFormation(f) {
    this.currentSquad.formation = f;
    // drop players that no longer fit the new formation's position caps
    const need = FORMATIONS[f];
    const kept = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of this.currentSquad.players) {
      if (kept[p.position].length < need[p.position]) kept[p.position].push(p);
    }
    this.currentSquad.players = [].concat(kept.GK, kept.DEF, kept.MID, kept.FWD);
    this.emit();
  },
  setMatchday(md) { this.currentMatchday = md; this.currentSquad.matchday = md; this.emit(); },
  setMode(m) { this.mode = m; this.emit(); },

  /* --- transfers (against a saved squad) --- */
  transfersRemaining() { return Math.max(0, RULES.maxTransfers - this.transfersUsed); },

  // Diff the saved baseline against the current pitch → list of {out, in} swaps,
  // paired within position so each is a formation-preserving single transfer.
  // Ordered budget-freeing-first so every intermediate squad stays <= the final
  // budget (the backend re-validates the squad after each individual transfer).
  pendingTransfers() {
    if (!this._baseline) return [];
    const base = JSON.parse(this._baseline).p;
    const curIds = new Set(this.currentSquad.players.map((p) => p.player_id));
    const baseIds = new Set(base.map((p) => p.player_id));
    const outsByPos = { GK: [], DEF: [], MID: [], FWD: [] };
    const insByPos = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of base) if (!curIds.has(p.player_id)) outsByPos[p.position].push(p);
    for (const p of this.currentSquad.players) if (!baseIds.has(p.player_id)) insByPos[p.position].push(p);
    const pairs = [];
    for (const pos of POSITIONS) {
      const outs = outsByPos[pos], ins = insByPos[pos];
      const n = Math.min(outs.length, ins.length);
      for (let i = 0; i < n; i++) pairs.push({ out: outs[i], in: ins[i] });
    }
    pairs.sort((a, b) => (a.in.base_price - a.out.base_price) - (b.in.base_price - b.out.base_price));
    return pairs;
  },

  isComplete() {
    if (this.currentSquad.players.length !== RULES.squadSize) return false;
    const need = FORMATIONS[this.currentSquad.formation];
    const c = this.posCounts();
    return POSITIONS.every((pos) => c[pos] === need[pos]);
  },
};
