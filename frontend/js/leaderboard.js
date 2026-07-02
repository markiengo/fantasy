const Leaderboard = (() => {
  let _mode = "overall";
  let _selectedMd = null;
  let _myUserId = null;

  function avatarUrl(seed) {
    return "https://api.dicebear.com/9.x/identicon/svg?seed=" + encodeURIComponent(seed) + "&backgroundColor=08090a,c6f24a,a6d92e,7aa2ff,ffb06c&radius=50";
  }

  function skeletonRows(n) {
    let html = "";
    for (let i = 0; i < n; i++) {
      html += '<div class="lb-skeleton-row">';
      html += '<div class="skeleton" style="width:24px"></div>';
      html += '<div class="skeleton" style="width:32px;height:32px;border-radius:50%"></div>';
      html += '<div class="skeleton" style="flex:1"></div>';
      html += '<div class="skeleton" style="width:40px"></div>';
      html += '</div>';
    }
    return html;
  }

  function renderRows(entries, showDelta) {
    let html = "";
    for (const entry of entries) {
      const isMe = entry.user_id === _myUserId;
      const rankCls = entry.rank === 1 ? " lb-row--rank1" : "";
      const youTag = isMe ? '<span class="lb-row__you">You</span>' : "";
      let deltaHtml = "";
      if (showDelta && entry.delta != null && entry.delta !== 0) {
        const cls = entry.delta > 0 ? "lb-row__delta--up" : "lb-row__delta--down";
        const sign = entry.delta > 0 ? "+" : "";
        deltaHtml = '<span class="lb-row__delta ' + cls + '">' + sign + entry.delta + '</span>';
      }
      html += '<div class="lb-row' + rankCls + '">';
      html += '<span class="lb-row__rank">' + entry.rank + '</span>';
      html += '<span class="lb-row__avatar" style="background-image:url(\'' + avatarUrl(entry.username) + '\')"></span>';
      html += '<span class="lb-row__name">' + entry.display_name + youTag + '</span>';
      html += deltaHtml;
      html += '<span class="lb-row__score">' + entry.squad_score + '</span>';
      html += '</div>';
    }
    return html;
  }

  function renderSticky(myEntry) {
    if (!myEntry) return "";
    return '<div class="lb-sticky">'
      + '<span class="lb-sticky__label">You</span>'
      + '<span class="lb-sticky__rank">#' + myEntry.rank + '</span>'
      + '<span class="lb-sticky__name">' + myEntry.display_name + '</span>'
      + '<span class="lb-sticky__score">' + myEntry.squad_score + '</span>'
      + '</div>';
  }

  function buildMatchdayStrip(scoredSet) {
    const strip = document.getElementById("lbMdStrip");
    if (!strip) return;
    if (_mode !== "matchday") { strip.hidden = true; return; }
    strip.hidden = false;

    const allMd = [];
    for (const meta of _roundMeta) {
      allMd.push(meta.matchday);
    }
    if (!allMd.length) { strip.innerHTML = ""; return; }

    if (_selectedMd == null || !allMd.includes(_selectedMd)) {
      _selectedMd = allMd[0];
    }

    let html = "";
    for (const md of allMd) {
      const meta = _roundMeta.find(function (r) { return r.matchday === md; });
      const label = meta ? meta.label : "R" + md;
      const active = md === _selectedMd;
      const hasData = scoredSet && scoredSet.has(md);
      const cls = "lb-md-tab" + (active ? " is-active" : "") + (!hasData ? " lb-md-tab--empty" : "");
      html += '<button class="' + cls + '" type="button" data-md="' + md + '">' + label + '</button>';
    }
    strip.innerHTML = html;

    strip.querySelectorAll(".lb-md-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        _selectedMd = Number(btn.dataset.md);
        render();
      });
    });
  }

  async function render() {
    const list = document.getElementById("lbList");
    const sticky = document.getElementById("lbSticky");
    const strip = document.getElementById("lbMdStrip");
    if (!list) return;

    list.innerHTML = skeletonRows(6);
    if (sticky) sticky.innerHTML = "";

    let data = null;
    try {
      data = await Api.getLeaderboard(_mode === "matchday" ? _selectedMd : null);
    } catch (e) {
      data = { entries: [], my_user_id: _myUserId };
    }

    _myUserId = data.my_user_id || _myUserId;
    const entries = data.entries || [];
    const showDelta = _mode === "matchday";

    if (!entries.length) {
      list.innerHTML = '<div class="lb-empty">No leaderboard data yet.</div>';
      buildMatchdayStrip(new Set());
      return;
    }

    list.innerHTML = renderRows(entries, showDelta);

    var myEntry = null;
    for (const entry of entries) {
      if (entry.user_id === _myUserId) { myEntry = entry; break; }
    }
    if (sticky) sticky.innerHTML = renderSticky(myEntry);

    if (_mode === "matchday") {
      const scoredSet = new Set();
      scoredSet.add(_selectedMd);
      buildMatchdayStrip(scoredSet);
    } else {
      buildMatchdayStrip(new Set());
    }
  }

  function bindToggle() {
    const btns = document.querySelectorAll(".lb-toggle__btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        _mode = btn.dataset.mode;
        render();
      });
    });
  }

  function init() {
    bindToggle();
  }

  return { render, init };
})();
