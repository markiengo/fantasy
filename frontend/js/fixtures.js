/* ============================================================================
   fixtures.js — Fixtures & Results screen (ref: fixtures.png).
   Group matches by date for the selected round; group pills + flags + kickoff.
   ============================================================================ */

const Fixtures = (() => {
  let round = 1;
  const MAX_ROUND = 8;

  const STAGE_LABEL = {
    group_stage: (md) => `Round ${md}`,
    round_of_32: () => "Round of 32",
    round_of_16: () => "Round of 16",
    quarter_final: () => "Quarter-final",
    semi_final: () => "Semi-final",
    final: () => "Final",
  };

  function teamGroup(team_id) {
    const t = State.teams.find((x) => x.team_id === team_id);
    return t ? t.group_stage : null;
  }

  function fmtDate(iso) {
    // iso "2026-06-18" -> "Thursday 18 June 2026" (no Date locale dependency issues)
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return `${days[dt.getUTCDay()]} ${d} ${months[m - 1]} ${y}`;
  }

  // deterministic mock kickoff time per match (no real schedule in v1)
  function kickoff(match) {
    const slots = ["18:00", "21:00", "00:00", "03:00"];
    return slots[match.match_id % slots.length];
  }

  function render() {
    const label = document.getElementById("fxRoundLabel");
    const list = document.getElementById("fixturesList");

    // If data isn't loaded yet (edge case during initial boot), show skeleton rows
    if (!State.fixtures.length) {
      label.textContent = "Loading…";
      let html = "";
      for (let i = 0; i < 6; i++) html += `<div class="skeleton" style="height:52px;border-radius:var(--r-md);margin-bottom:8px"></div>`;
      list.innerHTML = html;
      return;
    }

    // Filter the already-loaded matches client-side — NO network per round nav.
    // (Remote DB is ~1.3s/request; re-fetching per click was the slowness + scroll jump.)
    const matches = [];
    for (const m of State.fixtures) if (m.matchday === round) matches.push(m);

    const stage = matches.length ? matches[0].stage : "group_stage";
    label.textContent = (STAGE_LABEL[stage] || STAGE_LABEL.group_stage)(round);

    if (!matches.length) {
      list.innerHTML = `<p class="empty-note">No fixtures for this round yet.</p>`;
      return;
    }

    // group by date, sorted ascending
    const groups = {};
    for (const m of matches) {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    }
    const order = Object.keys(groups).sort();
    for (const date of order) groups[date].sort((a, b) => a.match_id - b.match_id);

    let html = "";
    for (const date of order) {
      html += `<div class="fixtures__daygroup">
        <div class="fixtures__date">${fmtDate(date)}</div>`;
      for (const m of groups[date]) html += matchRow(m);
      html += `</div>`;
    }
    list.innerHTML = html;
  }

  function matchRow(m) {
    const g = teamGroup(m.team1_id);
    const groupPill = g ? `<span class="pill pill--group" data-group="${g}">Group ${g}</span>` : "";
    // Show scores if match has been played, otherwise show kickoff time
    // Use != null (not !==) so undefined (mock data) also falls through to kickoff
    const center = (m.team1_score != null && m.team2_score != null)
      ? `<span class="match-row__score">${m.team1_score} - ${m.team2_score}</span>`
      : `<span class="match-row__kick">${kickoff(m)}</span>`;
    return `<div class="match-row">
      <span>${groupPill}</span>
      <span class="match-row__team match-row__team--home">${m.team1_name} ${flagImg(m.team1_id, "flag--lg")}</span>
      ${center}
      <span class="match-row__team match-row__team--away">${flagImg(m.team2_id, "flag--lg")} ${m.team2_name}</span>
      <span aria-hidden="true"></span>
    </div>`;
  }

  function init() {
    document.getElementById("fxPrev").addEventListener("click", () => {
      if (round > 1) { round--; render(); }
    });
    document.getElementById("fxNext").addEventListener("click", () => {
      if (round < MAX_ROUND) { round++; render(); }
    });
  }

  return { init, render, setRound: (r) => { round = r; } };
})();
