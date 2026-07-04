const Stats = (() => {
  const CATEGORIES = [
    { key: "top_fantasy_score", title: () => t("stats.fantasy_points"), hint: () => t("stats.hint_total"), isHero: true, suffix: () => t("stats.pts"), bento: "hero" },
    { key: "top_scorers", title: () => t("stats.top_scorers"), hint: () => t("stats.hint_goals"), bento: "normal" },
    { key: "top_assists", title: () => t("stats.assists"), hint: () => t("stats.hint_assists"), bento: "normal" },
    { key: "top_goal_involvements", title: () => t("stats.goal_involvements"), hint: () => t("stats.hint_ga"), bento: "normal" },
    { key: "top_clean_sheets", title: () => t("stats.clean_sheets"), hint: () => t("stats.hint_def_gk"), bento: "normal" },
    { key: "top_cards", title: () => t("stats.most_cards"), hint: () => t("stats.hint_yr"), isCards: true, bento: "wide" },
  ];

  function faceHtml(player, size) {
    const seed = encodeURIComponent(player.name).replace(/'/g, "%27");
    const src = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c6f24a,a6d92e,7aa2ff,ffb06c&radius=50`;
    return `<span class="avatar avatar--${size}" data-pos="${player.position}" style="background-image:url('${src}')"></span>`;
  }

  function skeletonRows(n) {
    let html = "";
    for (let i = 0; i < n; i++) {
      const w = 70 + (i % 3) * 10;
      html += `<li class="stats-skeleton-row">
        <div class="skeleton" style="width:18px;height:18px"></div>
        <div class="skeleton" style="width:34px;height:34px;border-radius:50%"></div>
        <div class="skeleton" style="flex:1;height:14px"></div>
        <div class="skeleton" style="width:${w}px;height:18px"></div>
      </li>`;
    }
    return html;
  }

  function renderRow(entry, index, category) {
    const rank = index + 1;
    const isLeader = rank === 1;
    const avatarSize = (isLeader && category.isHero) ? 44 : 34;
    const teamId = entry.team_id || "";

    let valueHtml;
    if (category.isCards) {
      const yc = entry.yellow_cards || 0;
      const rc = entry.red_cards || 0;
      valueHtml = `<span class="stats-row__cards">
        <span class="stats-card-icon stats-card-icon--yellow${yc === 0 ? " stats-card-icon--zero" : ""}">${yc}</span>
        <span class="stats-card-icon stats-card-icon--red${rc === 0 ? " stats-card-icon--zero" : ""}">${rc}</span>
      </span>`;
    } else if (category.suffix) {
      valueHtml = `<span class="stats-row__value">${escapeHtml(entry.value)}<small class="stats-row__unit">${typeof category.suffix === "function" ? category.suffix() : category.suffix}</small></span>`;
    } else {
      valueHtml = `<span class="stats-row__value">${escapeHtml(entry.value)}</span>`;
    }

    return `<li class="stats-row${isLeader ? " stats-row--leader" : ""}" role="button" tabindex="0">
      <span class="stats-row__rank">${rank}</span>
      <span class="stats-row__photo">
        ${faceHtml(entry, avatarSize)}
      </span>
      <span class="stats-row__info">
        ${flagImg(teamId, "flag--sm")}
        <span class="stats-row__name">${escapeHtml(entry.name)}</span>
      </span>
      ${valueHtml}
    </li>`;
  }

  function renderCard(category, data) {
    const entries = data[category.key] || [];
    const bentoClass = category.bento === "hero" ? " stats-card--hero" : category.bento === "wide" ? " stats-card--wide" : " stats-card--normal";
    const cardClass = "stats-card" + bentoClass;
    const revealIdx = CATEGORIES.indexOf(category) + 1;

    let bodyHtml;
    if (!entries.length) {
      bodyHtml = `<p class="stats-empty">${t("stats.no_data")}</p>`;
    } else {
      bodyHtml = `<ul class="stats-list">`;
      for (let i = 0; i < entries.length; i++) {
        bodyHtml += renderRow(entries[i], i, category);
      }
      bodyHtml += `</ul>`;
    }

    return `<article class="${cardClass} chart-reveal chart-reveal--${revealIdx}">
      <header class="stats-card__head">
        <span class="stats-card__dot"></span>
        <span class="stats-card__title">${typeof category.title === "function" ? category.title() : category.title}</span>
        <span class="stats-card__hint">${typeof category.hint === "function" ? category.hint() : category.hint}</span>
      </header>
      ${bodyHtml}
    </article>`;
  }

  function renderSkeleton() {
    let html = `<div class="stats-grid">`;
    for (const cat of CATEGORIES) {
      const bentoClass = cat.bento === "hero" ? " stats-card--hero" : cat.bento === "wide" ? " stats-card--wide" : " stats-card--normal";
      const cardClass = "stats-card" + bentoClass;
      html += `<article class="${cardClass}">
        <header class="stats-card__head">
          <span class="stats-card__dot"></span>
          <span class="stats-card__title">${typeof cat.title === "function" ? cat.title() : cat.title}</span>
          <span class="stats-card__hint">${typeof cat.hint === "function" ? cat.hint() : cat.hint}</span>
        </header>
        <ul class="stats-list">${skeletonRows(5)}</ul>
      </article>`;
    }
    html += `</div>`;
    return html;
  }

  async function render() {
    const root = document.getElementById("screen-stats");
    if (!root) return;
    const shell = root.querySelector(".stats-shell");
    if (!shell) return;

    Progress.start();
    shell.innerHTML = renderSkeleton();

    try {
      const data = await Api.getTopStats(5);
      let html = `<div class="stats-grid">`;
      for (const cat of CATEGORIES) {
        html += renderCard(cat, data);
      }
      html += `</div>`;
      shell.innerHTML = html;
    } catch (err) {
      shell.innerHTML = `<div class="stats-empty">${escapeHtml(t("stats.failed"))} ${escapeHtml(err.message || "")}</div>`;
    }
    Progress.done();
  }

  return { render };
})();
window.Stats = Stats;
