/* ============================================================================
   scores.js — Scores & Analytics screen (Phase 6).
   Cumulative points by round (bar), contribution by position (donut),
   and a top-contributors table. Reads GET /score (singular, per ui-spec §4).
   ============================================================================ */

const Scores = (() => {
  const POS_COLOR = {
    GK: "var(--pos-GK)", DEF: "var(--pos-DEF)", MID: "var(--pos-MID)", FWD: "var(--pos-FWD)",
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
      html += `<tr><td colspan="4"><div class="skeleton" style="height:18px;border-radius:6px"></div></td></tr>`;
    }
    return html;
  }

  function skeletonValueRows(n) {
    let html = "";
    for (let i = 0; i < n; i++) {
      html += `<div class="skeleton" style="height:36px;border-radius:var(--r-sm);margin-bottom:6px"></div>`;
    }
    return html;
  }

  function scoreOf(row) {
    // tolerate both API shapes (score | squad_score)
    return Number(row.score ?? row.squad_score ?? 0);
  }

  async function render() {
    // paint skeletons immediately — replaced by real content as each fetch resolves
    document.getElementById("scoreTotal").textContent = "—";
    document.getElementById("scoreBars").innerHTML = skeletonBars(5);
    document.getElementById("scoreDonut").style.background = "var(--glass-2)";
    document.getElementById("donutCenter").textContent = "";
    document.getElementById("donutLegend").innerHTML = `<div class="skeleton" style="height:60px;border-radius:var(--r-sm)"></div>`;
    document.getElementById("contribBody").innerHTML = skeletonTableRows(5);
    const valueElInit = document.getElementById("valueRows");
    if (valueElInit) valueElInit.innerHTML = skeletonValueRows(5);

    // --- cumulative (bars + total) ---
    let cumulative = { by_matchday: [] };
    try { cumulative = await Api.getScore(); } catch (e) { cumulative = { by_matchday: [] }; }
    const by = cumulative.by_matchday || [];

    let total = 0;
    const barData = [];
    for (const row of by) {
      const v = scoreOf(row);
      total += v;
      barData.push({ label: `R${row.matchday}`, value: v });
    }
    document.getElementById("scoreTotal").textContent = total;
    Charts.bars(document.getElementById("scoreBars"), barData);

    // --- current matchday breakdown (donut + table) ---
    let breakdown = [];
    try {
      const md = await Api.getScore(State.currentMatchday);
      breakdown = md.breakdown || [];
    } catch (e) { breakdown = []; }

    // donut by position
    const byPos = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const b of breakdown) byPos[b.position] += Math.max(0, scoreOf(b));
    const donutData = [];
    for (const pos of POSITIONS) {
      if (byPos[pos] > 0) donutData.push({ label: pos, value: byPos[pos], color: POS_COLOR[pos] });
    }
    Charts.donut(
      document.getElementById("scoreDonut"),
      document.getElementById("donutCenter"),
      document.getElementById("donutLegend"),
      donutData
    );

    // build price lookup from saved squad so we can show cost alongside points
    const priceOf = {};
    for (const p of State.currentSquad.players) priceOf[p.player_id] = p.base_price;

    // top contributors table
    const tbody = document.getElementById("contribBody");
    if (!breakdown.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-note">No scores recorded for Round ${State.currentMatchday} yet.</td></tr>`;
    } else {
      const sorted = breakdown.slice().sort((a, b) => scoreOf(b) - scoreOf(a));
      let html = "";
      for (const b of sorted) {
        const s = scoreOf(b);
        const price = priceOf[b.player_id];
        const priceCell = price != null ? `$${price.toFixed(1)}m` : "—";
        html += `<tr>
          <td class="contrib__name">${b.player_name}</td>
          <td class="contrib__pos" style="color:${POS_COLOR[b.position]}">${b.position}</td>
          <td class="contrib__price">${priceCell}</td>
          <td class="contrib__score ${s < 0 ? "contrib__score--neg" : ""}">${s}</td>
        </tr>`;
      }
      tbody.innerHTML = html;
    }

    // value-for-money card: paid → earned
    const valueEl = document.getElementById("valueRows");
    if (valueEl) {
      if (!breakdown.length) {
        valueEl.innerHTML = `<p class="empty-note">No data yet for Round ${State.currentMatchday}.</p>`;
      } else {
        // build list with price attached, filter to players we have prices for
        const rows = [];
        for (const b of breakdown) {
          const price = priceOf[b.player_id];
          if (price == null || price <= 0) continue;
          const pts = scoreOf(b);
          const ratio = pts / price;
          rows.push({ name: b.player_name, position: b.position, price, pts, ratio });
        }
        rows.sort((a, b) => b.ratio - a.ratio);

        const maxRatio = rows.length ? Math.max(...rows.map((r) => r.ratio)) : 1;
        let html = "";
        for (const r of rows) {
          const barPct = maxRatio > 0 ? Math.max(2, (r.ratio / maxRatio) * 100) : 2;
          const ratioLabel = r.ratio >= 0 ? `+${r.ratio.toFixed(1)}/m` : `${r.ratio.toFixed(1)}/m`;
          const barColor = r.ratio < 0 ? "var(--danger)" : "linear-gradient(90deg, var(--c-lime), var(--c-aqua))";
          html += `<div class="value-row">
            <span class="value-name" style="color:${POS_COLOR[r.position]}">${r.name}</span>
            <span class="value-price">$${r.price.toFixed(1)}m</span>
            <div class="value-bar-wrap">
              <div class="value-bar" style="width:${barPct}%;background:${barColor}"></div>
            </div>
            <span class="value-pts ${r.pts < 0 ? "contrib__score--neg" : ""}">${r.pts} pts</span>
            <span class="value-ratio">${ratioLabel}</span>
          </div>`;
        }
        valueEl.innerHTML = html || `<p class="empty-note">No priced players in squad.</p>`;
      }
    }
  }

  return { render };
})();
