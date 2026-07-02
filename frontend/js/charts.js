/* ───────────────────────────────────────────────────────────────────────────
   Charts — vanilla SVG chart library for the dashboard.
   Pinky-inspired aesthetic: dashed grids, hollow ring dots, gradient fills,
   frosted-glass tooltips, ease-out animations. Adapted to dark+lime theme.
   ─────────────────────────────────────────────────────────────────────────── */

const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const key in attrs) {
        if (key === "text") e.textContent = attrs[key];
        else e.setAttribute(key, attrs[key]);
      }
    }
    return e;
  }

  function makeTooltip() {
    let tip = document.querySelector(".dash-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "dash-tooltip";
      document.body.appendChild(tip);
    }
    return tip;
  }

  function showTooltip(tip, x, y, html) {
    tip.innerHTML = html;
    tip.classList.add("is-visible");
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function hideTooltip(tip) {
    tip.classList.remove("is-visible");
  }

  function niceMax(value) {
    if (value <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(value)));
    const norm = value / mag;
    let nice;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * mag;
  }

  function fmtSigned(v) {
    if (v > 0) return "+" + v;
    return String(v);
  }

  /* ── 1. Area chart — cumulative points trajectory ─────────────────────── */

  function areaChart(container, data, opts) {
    opts = opts || {};
    const selectedMd = opts.selectedMatchday;
    const onPointClick = opts.onPointClick;
    const tip = makeTooltip();

    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = '<p class="empty-note">No matches played yet.</p>';
      return;
    }

    const W = container.clientWidth || 600;
    const H = 120;
    const padL = 36;
    const padR = 16;
    const padT = 12;
    const padB = 24;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    let cumulative = 0;
    const points = [];
    for (let i = 0; i < data.length; i++) {
      cumulative += data[i].value;
      points.push({ x: i, y: cumulative, label: data[i].label, md: data[i].md, mdValue: data[i].value });
    }

    const maxY = niceMax(Math.max(1, Math.max.apply(null, points.map(function (p) { return p.y; }))));
    const xStep = points.length > 1 ? plotW / (points.length - 1) : 0;

    function px(i) { return padL + i * xStep; }
    function py(v) { return padT + plotH - (v / maxY) * plotH; }

    const svg = el("svg", { class: "dash-svg", viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none" });

    /* gradient def */
    const defs = el("defs");
    const grad = el("linearGradient", { id: "areaGradient", x1: "0", y1: "0", x2: "0", y2: "1" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": "var(--accent)", "stop-opacity": "0.35" }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": "var(--accent)", "stop-opacity": "0.02" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    /* grid lines */
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "dash-svg__grid-line", x1: padL, y1: gy, x2: W - padR, y2: gy }));
      const val = Math.round(maxY - (maxY / 4) * g);
      const t = el("text", { class: "dash-svg__axis-text", x: padL - 6, y: gy + 4, "text-anchor": "end" });
      t.textContent = val;
      svg.appendChild(t);
    }

    /* area path */
    let areaPath = "M " + px(0) + " " + py(points[0].y);
    for (let i = 1; i < points.length; i++) {
      areaPath += " L " + px(i) + " " + py(points[i].y);
    }
    areaPath += " L " + px(points.length - 1) + " " + (padT + plotH);
    areaPath += " L " + px(0) + " " + (padT + plotH) + " Z";

    const areaEl = el("path", { class: "dash-svg__area-fill", d: areaPath, fill: "url(#areaGradient)" });
    svg.appendChild(areaEl);

    /* line path */
    let linePath = "M " + px(0) + " " + py(points[0].y);
    for (let i = 1; i < points.length; i++) {
      linePath += " L " + px(i) + " " + py(points[i].y);
    }
    svg.appendChild(el("path", { class: "dash-svg__line", d: linePath, stroke: "var(--accent)" }));

    /* dots */
    for (let i = 0; i < points.length; i++) {
      const isActive = points[i].md === selectedMd;
      const dot = el("circle", {
        class: "dash-svg__dot" + (isActive ? " dash-svg__dot--active" : ""),
        cx: px(i),
        cy: py(points[i].y),
        r: isActive ? 7 : 4,
        fill: isActive ? "var(--accent)" : "var(--bg)",
        stroke: "var(--accent)",
        "stroke-width": isActive ? 3 : 2.5,
        style: "color: var(--accent)"
      });

      dot.addEventListener("mouseenter", function (e) {
        const rect = container.getBoundingClientRect();
        const html = '<div class="dash-tooltip__title">' + points[i].label + "</div>" +
          '<div class="dash-tooltip__row">This matchday <b>' + fmtSigned(points[i].mdValue) + "</b></div>" +
          '<div class="dash-tooltip__row">Cumulative <b>' + points[i].y + "</b></div>";
        showTooltip(tip, rect.left + px(i), rect.top + py(points[i].y), html);
      });
      dot.addEventListener("mouseleave", function () { hideTooltip(tip); });
      dot.addEventListener("click", function () {
        if (onPointClick) onPointClick(points[i].md);
      });

      svg.appendChild(dot);
    }

    /* x-axis labels */
    for (let i = 0; i < points.length; i++) {
      if (points.length > 6 && i % 2 !== 0 && i !== points.length - 1) continue;
      const t = el("text", { class: "dash-svg__axis-text", x: px(i), y: H - 6, "text-anchor": "middle" });
      t.textContent = points[i].label;
      svg.appendChild(t);
    }

    container.appendChild(svg);
  }

  /* ── 2. Captain impact — grouped bars per matchday ────────────────────── */

  function captainBars(container, data, opts) {
    opts = opts || {};
    const selectedMd = opts.selectedMatchday;
    const onBarClick = opts.onBarClick;
    const tip = makeTooltip();

    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = '<p class="empty-note">No captain data yet.</p>';
      return;
    }

    const W = container.clientWidth || 400;
    const H = 160;
    const padL = 36;
    const padR = 12;
    const padT = 16;
    const padB = 24;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxY = niceMax(Math.max.apply(null, data.map(function (d) { return Math.max(d.captainScore, d.squadAvg); })));

    const groupW = plotW / data.length;
    const barW = Math.min(20, groupW * 0.3);
    const gap = 4;

    const svg = el("svg", { class: "dash-svg", viewBox: "0 0 " + W + " " + H });

    /* grid */
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "dash-svg__grid-line", x1: padL, y1: gy, x2: W - padR, y2: gy }));
      const val = Math.round(maxY - (maxY / 4) * g);
      const t = el("text", { class: "dash-svg__axis-text", x: padL - 6, y: gy + 4, "text-anchor": "end" });
      t.textContent = val;
      svg.appendChild(t);
    }

    /* gradient defs */
    const defs = el("defs");
    const capGrad = el("linearGradient", { id: "capGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
    capGrad.appendChild(el("stop", { offset: "0%", "stop-color": "var(--pos-FWD)", "stop-opacity": "1" }));
    capGrad.appendChild(el("stop", { offset: "100%", "stop-color": "#e070a0", "stop-opacity": "0.7" }));
    defs.appendChild(capGrad);
    const avgGrad = el("linearGradient", { id: "avgGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
    avgGrad.appendChild(el("stop", { offset: "0%", "stop-color": "var(--pos-MID)", "stop-opacity": "0.8" }));
    avgGrad.appendChild(el("stop", { offset: "100%", "stop-color": "var(--pos-MID)", "stop-opacity": "0.4" }));
    defs.appendChild(avgGrad);
    svg.appendChild(defs);

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const cx = padL + groupW * i + groupW / 2;
      const isActive = d.md === selectedMd;

      const capH = (d.captainScore / maxY) * plotH;
      const avgH = (d.squadAvg / maxY) * plotH;

      const capX = cx - barW - gap / 2;
      const avgX = cx + gap / 2;

      const capBar = el("rect", {
        class: "dash-svg__bar" + (isActive ? "" : " dash-svg__bar--dimmed"),
        x: capX, y: padT + plotH - capH,
        width: barW, height: capH,
        rx: 4, ry: 4,
        fill: "url(#capGrad)"
      });

      const avgBar = el("rect", {
        class: "dash-svg__bar" + (isActive ? "" : " dash-svg__bar--dimmed"),
        x: avgX, y: padT + plotH - avgH,
        width: barW, height: avgH,
        rx: 4, ry: 4,
        fill: "url(#avgGrad)"
      });

      const handler = function (e) {
        const rect = container.getBoundingClientRect();
        const uplift = d.captainScore - d.squadAvg;
        const html = '<div class="dash-tooltip__title">' + d.label + "</div>" +
          '<div class="dash-tooltip__row"><span class="dash-tooltip__swatch" style="background:var(--pos-FWD)"></span>Captain (x2) <b>' + d.captainScore + "</b></div>" +
          '<div class="dash-tooltip__row"><span class="dash-tooltip__swatch" style="background:var(--pos-MID)"></span>Squad avg <b>' + d.squadAvg.toFixed(1) + "</b></div>" +
          '<div class="dash-tooltip__row">Uplift <b style="color:' + (uplift >= 0 ? "var(--pos-FWD)" : "var(--danger)") + '">' + fmtSigned(uplift.toFixed(1)) + "</b></div>";
        showTooltip(tip, rect.left + cx, rect.top + padT + plotH - Math.max(capH, avgH), html);
      };

      capBar.addEventListener("mouseenter", handler);
      avgBar.addEventListener("mouseenter", handler);
      capBar.addEventListener("mouseleave", function () { hideTooltip(tip); });
      avgBar.addEventListener("mouseleave", function () { hideTooltip(tip); });

      const clickHandler = function () { if (onBarClick) onBarClick(d.md); };
      capBar.addEventListener("click", clickHandler);
      avgBar.addEventListener("click", clickHandler);

      svg.appendChild(capBar);
      svg.appendChild(avgBar);

      /* x-axis label */
      const t = el("text", { class: "dash-svg__axis-text", x: cx, y: H - 6, "text-anchor": "middle" });
      t.textContent = d.label;
      svg.appendChild(t);
    }

    container.appendChild(svg);
  }

  /* ── 3. Stacked bar — score composition (horizontal) ──────────────────── */

  function stackedBar(container, data, opts) {
    opts = opts || {};
    const selectedMd = opts.selectedMatchday;
    const onBarClick = opts.onBarClick;
    const tip = makeTooltip();

    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = '<p class="empty-note">No composition data yet.</p>';
      return;
    }

    const segments = [
      { key: "goals_pts", label: "Goals", color: "var(--pos-FWD)" },
      { key: "assist_pts", label: "Assists", color: "var(--pos-MID)" },
      { key: "cs_pts", label: "Clean sheets", color: "var(--pos-DEF)" },
      { key: "minute_pts", label: "Minutes", color: "var(--warm)" },
      { key: "card_pts", label: "Cards", color: "var(--danger)" }
    ];

    const W = container.clientWidth || 400;
    const rowH = 36;
    const padL = 48;
    const padR = 12;
    const padT = 12;
    const padB = 20;
    const plotW = W - padL - padR;
    const plotH = data.length * rowH;
    const H = padT + plotH + padB;

    let maxAbs = 1;
    for (let i = 0; i < data.length; i++) {
      let rowTotal = 0;
      for (let j = 0; j < segments.length; j++) {
        rowTotal += Math.abs(data[i][segments[j].key]);
      }
      if (rowTotal > maxAbs) maxAbs = rowTotal;
    }
    const maxX = niceMax(maxAbs);

    const svg = el("svg", { class: "dash-svg", viewBox: "0 0 " + W + " " + H });

    /* vertical grid lines + x-axis labels */
    for (let g = 0; g <= 4; g++) {
      const gx = padL + (plotW / 4) * g;
      svg.appendChild(el("line", { class: "dash-svg__grid-line", x1: gx, y1: padT, x2: gx, y2: padT + plotH }));
      const val = Math.round((maxX / 4) * g);
      const t = el("text", { class: "dash-svg__axis-text", x: gx, y: H - 6, "text-anchor": "middle" });
      t.textContent = val;
      svg.appendChild(t);
    }

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const isActive = d.md === selectedMd;
      const cy = padT + i * rowH + rowH / 2;
      const barH = Math.min(24, rowH * 0.7);

      /* y-axis label */
      const t = el("text", { class: "dash-svg__axis-text", x: padL - 8, y: cy + 4, "text-anchor": "end" });
      t.textContent = d.label;
      svg.appendChild(t);

      let xOffset = padL;
      for (let j = 0; j < segments.length; j++) {
        const seg = segments[j];
        const val = d[seg.key];
        if (val === 0) continue;
        const segW = (Math.abs(val) / maxX) * plotW;

        const rect = el("rect", {
          class: "dash-svg__bar" + (isActive ? "" : " dash-svg__bar--dimmed"),
          x: xOffset, y: cy - barH / 2,
          width: segW, height: barH,
          rx: j === 0 ? 4 : 0, ry: j === 0 ? 4 : 0,
          fill: seg.color,
          opacity: 0.85
        });

        rect.addEventListener("mouseenter", function (e) {
          const rect2 = container.getBoundingClientRect();
          const html = '<div class="dash-tooltip__title">' + d.label + "</div>" +
            '<div class="dash-tooltip__row"><span class="dash-tooltip__swatch" style="background:' + seg.color + '"></span>' + seg.label + " <b>" + fmtSigned(val) + "</b></div>" +
            '<div class="dash-tooltip__row">Total <b>' + d.total + "</b></div>";
          showTooltip(tip, rect2.left + xOffset + segW / 2, rect2.top + cy - barH / 2, html);
        });
        rect.addEventListener("mouseleave", function () { hideTooltip(tip); });
        rect.addEventListener("click", function () { if (onBarClick) onBarClick(d.md); });

        svg.appendChild(rect);
        xOffset += segW;
      }
    }

    container.appendChild(svg);

    /* legend */
    if (opts.legendContainer) {
      let legendHtml = "";
      for (let j = 0; j < segments.length; j++) {
        legendHtml += '<span class="comp-legend__item"><span class="comp-legend__swatch" style="background:' + segments[j].color + '"></span>' + segments[j].label + "</span>";
      }
      opts.legendContainer.innerHTML = legendHtml;
    }
  }

  /* ── 4. Rank line — inverted Y axis ───────────────────────────────────── */

  function rankLine(container, data, opts) {
    opts = opts || {};
    const selectedMd = opts.selectedMatchday;
    const onPointClick = opts.onPointClick;
    const tip = makeTooltip();

    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = '<p class="empty-note">No rank data yet.</p>';
      return;
    }

    const W = container.clientWidth || 600;
    const H = 160;
    const padL = 48;
    const padR = 16;
    const padT = 12;
    const padB = 24;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxRank = Math.max.apply(null, data.map(function (d) { return d.rank; }));
    const yMax = Math.max(maxRank + 1, 5);

    const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;

    function px(i) { return padL + i * xStep; }
    /* inverted: rank 1 at top */
    function py(rank) { return padT + ((rank - 1) / (yMax - 1)) * plotH; }

    const svg = el("svg", { class: "dash-svg", viewBox: "0 0 " + W + " " + H });

    /* grid */
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "dash-svg__grid-line", x1: padL, y1: gy, x2: W - padR, y2: gy }));
      const rank = Math.round(1 + ((yMax - 1) / 4) * g);
      const t = el("text", { class: "dash-svg__axis-text", x: padL - 6, y: gy + 4, "text-anchor": "end" });
      t.textContent = "#" + rank;
      svg.appendChild(t);
    }

    /* line path */
    let linePath = "M " + px(0) + " " + py(data[0].rank);
    for (let i = 1; i < data.length; i++) {
      linePath += " L " + px(i) + " " + py(data[i].rank);
    }
    svg.appendChild(el("path", { class: "dash-svg__line", d: linePath, stroke: "var(--blue)" }));

    /* dots */
    for (let i = 0; i < data.length; i++) {
      const isActive = data[i].matchday === selectedMd;
      const dot = el("circle", {
        class: "dash-svg__dot" + (isActive ? " dash-svg__dot--active" : ""),
        cx: px(i),
        cy: py(data[i].rank),
        r: isActive ? 7 : 4,
        fill: isActive ? "var(--blue)" : "var(--bg)",
        stroke: "var(--blue)",
        "stroke-width": isActive ? 3 : 2.5,
        style: "color: var(--blue)"
      });

      dot.addEventListener("mouseenter", function (e) {
        const rect = container.getBoundingClientRect();
        const html = '<div class="dash-tooltip__title">' + (data[i].label || "MD" + data[i].matchday) + "</div>" +
          '<div class="dash-tooltip__row">Rank <b>#' + data[i].rank + "</b></div>" +
          '<div class="dash-tooltip__row">Score <b>' + data[i].squad_score + "</b></div>" +
          '<div class="dash-tooltip__row">Managers <b>' + data[i].total_managers + "</b></div>";
        showTooltip(tip, rect.left + px(i), rect.top + py(data[i].rank), html);
      });
      dot.addEventListener("mouseleave", function () { hideTooltip(tip); });
      dot.addEventListener("click", function () {
        if (onPointClick) onPointClick(data[i].matchday);
      });

      svg.appendChild(dot);
    }

    /* x-axis labels */
    for (let i = 0; i < data.length; i++) {
      if (data.length > 6 && i % 2 !== 0 && i !== data.length - 1) continue;
      const t = el("text", { class: "dash-svg__axis-text", x: px(i), y: H - 6, "text-anchor": "middle" });
      t.textContent = data[i].label || ("MD" + data[i].matchday);
      svg.appendChild(t);
    }

    container.appendChild(svg);
  }

  /* ── 5. Scatter plot — price vs points ────────────────────────────────── */

  function scatterPlot(container, data, opts) {
    opts = opts || {};
    const tip = makeTooltip();
    const posColors = opts.posColors || {
      GK: "var(--pos-GK)",
      DEF: "var(--pos-DEF)",
      MID: "var(--pos-MID)",
      FWD: "var(--pos-FWD)"
    };
    const onLegendToggle = opts.onLegendToggle;
    const hiddenPositions = opts.hiddenPositions || {};

    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = '<p class="empty-note">No data for this matchday.</p>';
      return;
    }

    const W = container.clientWidth || 300;
    const H = 200;
    const padL = 36;
    const padR = 12;
    const padT = 12;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxPrice = Math.max.apply(null, data.map(function (d) { return d.price; }));
    const maxPoints = Math.max.apply(null, data.map(function (d) { return d.points; }));
    const minPoints = Math.min.apply(null, data.map(function (d) { return d.points; }));

    const xMax = Math.ceil(maxPrice + 1);
    const yMax = niceMax(Math.max(1, Math.abs(maxPoints) + 2));
    const yMin = minPoints < 0 ? -niceMax(Math.abs(minPoints) + 2) : 0;
    const yRange = yMax - yMin;

    function px(price) { return padL + (price / xMax) * plotW; }
    function py(points) { return padT + plotH - ((points - yMin) / yRange) * plotH; }

    const svg = el("svg", { class: "dash-svg", viewBox: "0 0 " + W + " " + H });

    /* grid */
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (plotH / 4) * g;
      svg.appendChild(el("line", { class: "dash-svg__grid-line", x1: padL, y1: gy, x2: W - padR, y2: gy }));
      const val = Math.round(yMax - (yRange / 4) * g);
      const t = el("text", { class: "dash-svg__axis-text", x: padL - 6, y: gy + 4, "text-anchor": "end" });
      t.textContent = val;
      svg.appendChild(t);
    }

    /* x-axis labels */
    for (let g = 0; g <= 4; g++) {
      const gx = padL + (plotW / 4) * g;
      const val = Math.round((xMax / 4) * g);
      const t = el("text", { class: "dash-svg__axis-text", x: gx, y: H - 8, "text-anchor": "middle" });
      t.textContent = "$" + val + "m";
      svg.appendChild(t);
    }

    /* fair value line */
    let totalPts = 0;
    let totalPrice = 0;
    for (let i = 0; i < data.length; i++) {
      totalPts += data[i].points;
      totalPrice += data[i].price;
    }
    const avgRatio = totalPrice > 0 ? totalPts / totalPrice : 0;
    if (avgRatio > 0) {
      const x1 = padL;
      const y1 = py(0);
      const x2 = padL + plotW;
      const y2 = py(avgRatio * xMax);
      svg.appendChild(el("line", { class: "dash-svg__fair-value", x1: x1, y1: y1, x2: x2, y2: y2 }));
    }

    /* dots */
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (hiddenPositions[d.position]) continue;
      const color = posColors[d.position] || "var(--accent)";
      const aboveLine = d.price > 0 && d.points / d.price > avgRatio;

      const dot = el("circle", {
        cx: px(d.price),
        cy: py(d.points),
        r: 6,
        fill: "var(--bg)",
        stroke: color,
        "stroke-width": 2.5,
        style: "cursor:pointer;" + (aboveLine ? "filter:drop-shadow(0 0 4px " + color + ")" : "opacity:0.7")
      });

      dot.addEventListener("mouseenter", function (e) {
        const rect = container.getBoundingClientRect();
        const ratio = d.price > 0 ? (d.points / d.price).toFixed(1) : "N/A";
        const html = '<div class="dash-tooltip__title">' + d.name + "</div>" +
          '<div class="dash-tooltip__row"><span class="dash-tooltip__swatch" style="background:' + color + '"></span>' + d.position + " <b>$" + d.price.toFixed(1) + "m</b></div>" +
          '<div class="dash-tooltip__row">Points <b>' + d.points + "</b></div>" +
          '<div class="dash-tooltip__row">Pts/$m <b>' + ratio + "</b></div>";
        showTooltip(tip, rect.left + px(d.price), rect.top + py(d.points), html);
      });
      dot.addEventListener("mouseleave", function () { hideTooltip(tip); });

      svg.appendChild(dot);
    }

    container.appendChild(svg);

    /* legend */
    if (opts.legendContainer) {
      const positions = ["GK", "DEF", "MID", "FWD"];
      let legendHtml = "";
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const isOff = hiddenPositions[pos];
        legendHtml += '<span class="scatter-legend__item' + (isOff ? " is-off" : "") + '" data-pos="' + pos + '" style="color:' + posColors[pos] + '">' +
          '<span class="scatter-legend__dot"></span>' + pos + "</span>";
      }
      opts.legendContainer.innerHTML = legendHtml;
      const items = opts.legendContainer.querySelectorAll(".scatter-legend__item");
      for (let i = 0; i < items.length; i++) {
        items[i].addEventListener("click", function () {
          if (onLegendToggle) onLegendToggle(items[i].dataset.pos);
        });
      }
    }
  }

  /* ── Existing: bars (kept for compatibility) ──────────────────────────── */

  function bars(container, data) {
    if (!container) return;
    container.innerHTML = "";
    if (!data.length) {
      container.innerHTML = '<p class="empty-note">No data yet.</p>';
      return;
    }
    let max = 1;
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i].value) > max) max = Math.abs(data[i].value);
    }
    let html = "";
    for (let i = 0; i < data.length; i++) {
      const pct = Math.max(3, Math.abs(data[i].value) / max * 100);
      html += '<div class="bar"><div class="bar__fill" style="height:' + pct + '%"></div>' +
        '<span class="bar__val">' + data[i].value + "</span>" +
        '<span class="bar__label">' + data[i].label + "</span></div>";
    }
    container.innerHTML = html;
  }

  /* ── Existing: donut (kept) ───────────────────────────────────────────── */

  function donut(svgEl, centerEl, legendEl, data) {
    if (!svgEl) return;
    svgEl.innerHTML = "";
    svgEl.style.background = "transparent";

    if (!data.length) {
      if (centerEl) centerEl.textContent = "0";
      if (legendEl) legendEl.innerHTML = '<span class="empty-note">No data</span>';
      return;
    }

    let total = 0;
    for (let i = 0; i < data.length; i++) total += data[i].value;
    if (centerEl) centerEl.textContent = total;

    const size = 112;
    const strokeW = 14;
    const r = (size - strokeW) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;

    const svg = el("svg", { width: size, height: size, viewBox: "0 0 " + size + " " + size });
    svg.style.position = "absolute";
    svg.style.inset = "0";

    let offset = 0;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const frac = d.value / total;
      const dashLen = frac * circumference;
      const circle = el("circle", {
        cx: cx, cy: cy, r: r,
        fill: "none",
        stroke: d.color,
        "stroke-width": strokeW,
        "stroke-dasharray": dashLen + " " + (circumference - dashLen),
        "stroke-dashoffset": -offset,
        transform: "rotate(-90 " + cx + " " + cy + ")"
      });
      svg.appendChild(circle);
      offset += dashLen;
    }

    svgEl.appendChild(svg);

    if (legendEl) {
      let html = "";
      for (let i = 0; i < data.length; i++) {
        html += '<li><span class="legend__swatch" style="background:' + data[i].color + '"></span>' +
          data[i].label + " <b>" + data[i].value + "</b></li>";
      }
      legendEl.innerHTML = html;
    }
  }

  return {
    areaChart: areaChart,
    captainBars: captainBars,
    stackedBar: stackedBar,
    rankLine: rankLine,
    scatterPlot: scatterPlot,
    bars: bars,
    donut: donut,
  };
})();
