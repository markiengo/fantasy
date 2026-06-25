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
        <div class="bar__fill" style="height:0%;transition:height var(--dur-slow) var(--ease-spring)" data-target="${h}"></div>
        <span class="bar__label">${d.label}</span>
      </div>`;
    }
    container.innerHTML = html;
    requestAnimationFrame(() => {
      container.querySelectorAll(".bar__fill").forEach((fill) => {
        fill.style.height = fill.dataset.target + "%";
      });
    });
  }

  /* Donut via SVG: data = [{label, value, color}] */
  function donut(el, centerEl, legendEl, data) {
    let total = 0;
    for (const d of data) total += d.value;
    if (total <= 0) {
      el.innerHTML = '';
      el.style.background = "rgba(255,255,255,.06)";
      if (centerEl) centerEl.textContent = "0";
      if (legendEl) legendEl.innerHTML = `<p class="empty-note">No contributions yet.</p>`;
      return;
    }
    const size = 112;
    const stroke = 13;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    let segments = "";
    for (const d of data) {
      const frac = d.value / total;
      const dash = frac * circ;
      const offset = (acc / total) * circ;
      segments += `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" style="transition: stroke-dasharray var(--dur-slow) var(--ease-spring)"/>`;
      acc += d.value;
    }
    el.style.background = "transparent";
    el.style.boxShadow = "none";
    el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">${segments}</svg>`;
    if (centerEl) centerEl.textContent = total;

    if (legendEl) {
      let html = "";
      for (const d of data) {
        const pct = Math.round((d.value / total) * 100);
        html += `<div class="legend__item">
          <span class="legend__swatch" style="background:${d.color}"></span>
          ${d.label} \u2014 ${d.value} (${pct}%)
        </div>`;
      }
      legendEl.innerHTML = html;
    }
  }

  return { bars, donut };
})();
