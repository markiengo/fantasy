/* ============================================================================
   charts.js — tiny dependency-free chart renderers (bar + donut) used by the
   Scores & Analytics screen. Pure DOM/CSS; no external chart library.
   ============================================================================ */

const Charts = (() => {
  /* Vertical bar chart: data = [{label, value}] into a .bars container */
  function bars(container, data) {
    if (!data.length) { container.innerHTML = `<p class="empty-note">No points yet.</p>`; return; }
    let max = 1;
    for (const d of data) max = Math.max(max, d.value);
    let html = "";
    for (const d of data) {
      const h = Math.max(2, (d.value / max) * 100);
      html += `<div class="bar">
        <span class="bar__val">${d.value}</span>
        <div class="bar__fill" style="height:${h}%"></div>
        <span class="bar__label">${d.label}</span>
      </div>`;
    }
    container.innerHTML = html;
  }

  /* Donut via conic-gradient: data = [{label, value, color}] */
  function donut(el, centerEl, legendEl, data) {
    let total = 0;
    for (const d of data) total += d.value;
    if (total <= 0) {
      el.style.background = "var(--surface-2)";
      if (centerEl) centerEl.textContent = "0";
      if (legendEl) legendEl.innerHTML = `<p class="empty-note">No contributions yet.</p>`;
      return;
    }
    let acc = 0;
    const stops = [];
    for (const d of data) {
      const start = (acc / total) * 360;
      acc += d.value;
      const end = (acc / total) * 360;
      stops.push(`${d.color} ${start}deg ${end}deg`);
    }
    el.style.background = `conic-gradient(${stops.join(", ")})`;
    if (centerEl) centerEl.textContent = total;

    if (legendEl) {
      let html = "";
      for (const d of data) {
        const pct = Math.round((d.value / total) * 100);
        html += `<div class="legend__item">
          <span class="legend__swatch" style="background:${d.color}"></span>
          ${d.label} — ${d.value} (${pct}%)
        </div>`;
      }
      legendEl.innerHTML = html;
    }
  }

  return { bars, donut };
})();
