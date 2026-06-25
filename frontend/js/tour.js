const Tour = (() => {
  const MOBILE_BREAK = 760;
  const CARD_GAP = 18;
  const EDGE_MARGIN = 16;
  const DEFAULT_PAD = 8;

  const BUILD_STEPS = [
    {
      target: "#pitch",
      preferred: ".pitch-panel",
      title: "Build your XI",
      body: "This is your pitch. You need 11 players in a 4-3-3 or 4-4-2 shape. Tap any empty slot to filter the pool by position.",
      mobileTab: "pitch",
    },
    {
      target: ".pool",
      preferred: ".pool.team-shell__rail",
      title: "Pick your players",
      body: "Browse and filter players here. Click the + button on any row to add them to your squad.",
      mobileTab: "players",
      pad: 10,
    },
    {
      target: "#statRemaining",
      preferred: ".stat-tile--accent",
      title: "Watch the budget",
      body: "You have $50m to spend. This meter tracks how much you've used and what's left.",
      mobileTab: "summary",
    },
    {
      target: "#formationSwitch",
      title: "Choose your shape",
      body: "Switch between 4-3-3 and 4-4-2. Your formation determines how many players you need at each position.",
      mobileTab: "summary",
    },
    {
      target: "#scoreHelpBtn",
      title: "How points work",
      body: "Tap this icon anytime to see how fantasy points are calculated for each position - goals, assists, clean sheets, cards.",
      mobileTab: null,
    },
    {
      target: "#saveSquadBtn",
      title: "Save when ready",
      body: "Once you've filled all 11 slots and stayed under budget, hit Save to lock in your squad.",
      mobileTab: "summary",
    },
  ];

  const TRANSFER_STEPS = [
    {
      target: "#makeTransfersBtn",
      title: "Make transfers",
      body: "Your saved squad is locked. Click here to enter transfer mode and swap players.",
      mobileTab: "summary",
    },
    {
      target: ".player-token:not(.player-token--empty)",
      title: "Remove a player",
      body: "Click the x on any player token to remove them from your squad. This frees up a slot and budget.",
      mobileTab: "pitch",
      multi: true,
      pad: 10,
    },
    {
      target: ".pool",
      preferred: ".pool.team-shell__rail",
      title: "Add a replacement",
      body: "Pick a new player from the pool. They must fit the same position slot and stay within budget.",
      mobileTab: "players",
      pad: 10,
    },
    {
      target: "#confirmBtn",
      title: "Confirm transfers",
      body: "When your swaps are ready, click Confirm. Each transfer is sent to the backend individually. You get 5 per matchday.",
      mobileTab: "summary",
    },
  ];

  let _steps = BUILD_STEPS;
  let _index = 0;
  let _overlay = null;
  let _spotlight = null;
  let _card = null;
  let _mattes = null;
  let _active = false;
  let _isTransfer = false;
  let _listenersBound = false;
  let _hasShownStep = false;
  let _pendingSync = false;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAK;
  }

  function px(value) {
    return `${Math.max(0, Math.round(value))}px`;
  }

  function fixedPx(value) {
    const zoom = parseFloat(window.getComputedStyle(document.documentElement).zoom) || 1;
    return px(value / zoom);
  }

  function nextFrame(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  function scheduleSync() {
    if (_pendingSync) return;
    _pendingSync = true;
    requestAnimationFrame(() => {
      _pendingSync = false;
      if (_active) syncCurrentStep(false);
    });
  }

  function ensureDOM() {
    if (_overlay) return;

    _overlay = document.createElement("div");
    _overlay.className = "tour-overlay";

    _mattes = {
      top: document.createElement("div"),
      right: document.createElement("div"),
      bottom: document.createElement("div"),
      left: document.createElement("div"),
    };

    Object.keys(_mattes).forEach((key) => {
      const matte = _mattes[key];
      matte.className = `tour-matte tour-matte--${key}`;
      matte.dataset.matte = key;
      _overlay.appendChild(matte);
    });

    _spotlight = document.createElement("div");
    _spotlight.className = "tour-spotlight";

    _card = document.createElement("div");
    _card.className = "tour-card";
    _card.setAttribute("role", "dialog");
    _card.setAttribute("aria-modal", "true");

    _overlay.appendChild(_spotlight);
    _overlay.appendChild(_card);
    document.body.appendChild(_overlay);

    _overlay.addEventListener("click", (e) => {
      if (e.target === _overlay || e.target.dataset.matte) skip();
    });

    if (_listenersBound) return;
    _listenersBound = true;

    document.addEventListener("keydown", (e) => {
      if (!_active) return;
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });

    window.addEventListener("resize", () => {
      if (_active) scheduleSync();
    }, { passive: true });

    window.addEventListener("scroll", () => {
      if (_active) scheduleSync();
    }, { passive: true });
  }

  function selectElements(selector) {
    if (!selector) return [];
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch (err) {
      return [];
    }
  }

  function getFallbackElements(step) {
    if (step.target === "#saveSquadBtn") {
      return selectElements(".summary-actions .btn--primary");
    }
    if (step.target === "#confirmBtn") {
      return selectElements("#confirmBtn");
    }
    return [];
  }

  function getVisibleElements(step) {
    let elements = [];

    if (step.preferred) {
      elements = selectElements(step.preferred);
    }
    if (!elements.length) {
      elements = selectElements(step.target);
    }
    if (!elements.length) {
      elements = getFallbackElements(step);
    }

    return elements.filter((el) => {
      if (!el || !el.isConnected) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function getFrame(step) {
    const elements = getVisibleElements(step);
    if (!elements.length) return null;

    const pad = step.pad || DEFAULT_PAD;
    const source = step.multi ? elements : [elements[0]];

    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    source.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < top) top = rect.top;
      if (rect.left < left) left = rect.left;
      if (rect.right > right) right = rect.right;
      if (rect.bottom > bottom) bottom = rect.bottom;
    });

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    top = Math.max(0, top - pad);
    left = Math.max(0, left - pad);
    right = Math.min(viewportW, right + pad);
    bottom = Math.min(viewportH, bottom + pad);

    let radius = 22;
    if (!step.multi && source[0]) {
      radius = parseFloat(window.getComputedStyle(source[0]).borderRadius) || 22;
    }

    return {
      elements: source,
      top,
      left,
      right,
      bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      radius,
    };
  }

  function updateMattes(frame) {
    if (!_overlay || !_mattes || !_spotlight) return;

    _spotlight.style.top = fixedPx(frame.top);
    _spotlight.style.left = fixedPx(frame.left);
    _spotlight.style.width = fixedPx(frame.width);
    _spotlight.style.height = fixedPx(frame.height);
    _spotlight.style.borderRadius = fixedPx(Math.max(14, frame.radius));

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    _mattes.top.style.top = "0px";
    _mattes.top.style.left = "0px";
    _mattes.top.style.width = fixedPx(viewportW);
    _mattes.top.style.height = fixedPx(frame.top);

    _mattes.right.style.top = fixedPx(frame.top);
    _mattes.right.style.left = fixedPx(frame.right);
    _mattes.right.style.width = fixedPx(viewportW - frame.right);
    _mattes.right.style.height = fixedPx(frame.height);

    _mattes.bottom.style.top = fixedPx(frame.bottom);
    _mattes.bottom.style.left = "0px";
    _mattes.bottom.style.width = fixedPx(viewportW);
    _mattes.bottom.style.height = fixedPx(viewportH - frame.bottom);

    _mattes.left.style.top = fixedPx(frame.top);
    _mattes.left.style.left = "0px";
    _mattes.left.style.width = fixedPx(frame.left);
    _mattes.left.style.height = fixedPx(frame.height);
  }

  function positionCardDesktop(frame) {
    if (!_card) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = _card.offsetWidth || 320;
    const cardH = _card.offsetHeight || 180;

    const placements = [];
    const centerTop = frame.top + (frame.height / 2) - (cardH / 2);
    const centerLeft = frame.left + (frame.width / 2) - (cardW / 2);

    if (viewportW - frame.right >= cardW + CARD_GAP + EDGE_MARGIN) {
      placements.push({ top: centerTop, left: frame.right + CARD_GAP });
    }
    if (frame.left >= cardW + CARD_GAP + EDGE_MARGIN) {
      placements.push({ top: centerTop, left: frame.left - cardW - CARD_GAP });
    }
    if (viewportH - frame.bottom >= cardH + CARD_GAP + EDGE_MARGIN) {
      placements.push({ top: frame.bottom + CARD_GAP, left: centerLeft });
    }
    if (frame.top >= cardH + CARD_GAP + EDGE_MARGIN) {
      placements.push({ top: frame.top - cardH - CARD_GAP, left: centerLeft });
    }
    if (!placements.length) {
      placements.push({ top: centerTop, left: centerLeft });
    }

    const chosen = placements[0];
    const maxLeft = viewportW - cardW - EDGE_MARGIN;
    const maxTop = viewportH - cardH - EDGE_MARGIN;

    const left = Math.min(Math.max(EDGE_MARGIN, chosen.left), Math.max(EDGE_MARGIN, maxLeft));
    const top = Math.min(Math.max(EDGE_MARGIN, chosen.top), Math.max(EDGE_MARGIN, maxTop));

    _card.style.top = fixedPx(top);
    _card.style.left = fixedPx(left);
  }

  function setCardMode() {
    if (!_card) return;
    if (isMobile()) {
      _card.classList.add("is-mobile");
      _card.style.top = "";
      _card.style.left = "";
    } else {
      _card.classList.remove("is-mobile");
    }
  }

  function switchMobileTab(tab) {
    if (!tab || !isMobile()) return;
    if (typeof setTeamPane === "function") {
      setTeamPane(tab);
    }
  }

  function renderCard() {
    _card.classList.remove("is-ready");
    const step = _steps[_index];
    const total = _steps.length;

    let dotsHtml = "";
    for (let i = 0; i < total; i++) {
      dotsHtml += `<span class="tour-dot${i === _index ? " is-active" : ""}"></span>`;
    }

    const isFirst = _index === 0;
    const isLast = _index === total - 1;

    _card.innerHTML = `
      <div class="tour-card__title">${step.title}</div>
      <div class="tour-card__body">${step.body}</div>
      <div class="tour-card__nav">
        <button class="btn btn--ghost btn--sm tour-card__back" type="button"${isFirst ? " hidden" : ""}>Back</button>
        <span class="tour-card__dots">${dotsHtml}</span>
        <button class="btn btn--text tour-card__skip" type="button">Skip tour</button>
        <button class="btn btn--primary btn--sm tour-card__next" type="button">${isLast ? "Finish" : "Next"}</button>
      </div>
    `;

    _card.querySelector(".tour-card__back").addEventListener("click", prev);
    _card.querySelector(".tour-card__skip").addEventListener("click", skip);
    _card.querySelector(".tour-card__next").addEventListener("click", () => {
      if (isLast) finish();
      else next();
    });
  }

  function syncCurrentStep(animate) {
    const step = _steps[_index];
    if (!step) return false;

    const frame = getFrame(step);
    if (!frame) return false;

    updateMattes(frame);
    setCardMode();

    if (!isMobile()) {
      positionCardDesktop(frame);
    }

    return true;
  }

  function showStep() {
    const step = _steps[_index];
    if (!step) return;

    switchMobileTab(step.mobileTab);

    nextFrame(() => {
      const frame = getFrame(step);
      if (!frame) {
        if (_index < _steps.length - 1) {
          _index = _index + 1;
          showStep();
        } else {
          finish();
        }
        return;
      }

      frame.elements[0].scrollIntoView({ behavior: "auto", block: "center", inline: "center" });

      nextFrame(() => {
        renderCard();
        setCardMode();
        _card.style.visibility = "hidden";

        if (!syncCurrentStep(_hasShownStep)) {
          _card.style.visibility = "";
          return;
        }

        _overlay.classList.add("is-visible");

        requestAnimationFrame(() => {
          _card.style.visibility = "";
          syncCurrentStep(_hasShownStep);
          _card.classList.add("is-ready");
          _hasShownStep = true;
        });
      });
    });
  }

  const ENABLED = true;

  function start(steps) {
    if (!ENABLED || _active) return;
    _steps = steps || BUILD_STEPS;
    _isTransfer = _steps === TRANSFER_STEPS;
    _index = 0;
    _active = true;
    _hasShownStep = false;
    ensureDOM();
    showStep();
  }

  function next() {
    if (!_active) return;
    if (_index >= _steps.length - 1) {
      finish();
      return;
    }
    _index = _index + 1;
    showStep();
  }

  function prev() {
    if (!_active || _index === 0) return;
    _index = _index - 1;
    showStep();
  }

  function cleanup() {
    _active = false;
    _index = 0;
    _isTransfer = false;
    _hasShownStep = false;

    if (_overlay) {
      _overlay.classList.remove("is-visible");
    }
    if (_spotlight) {
      _spotlight.style.top = "";
      _spotlight.style.left = "";
      _spotlight.style.width = "";
      _spotlight.style.height = "";
      _spotlight.style.borderRadius = "";
    }
    if (_card) {
      _card.innerHTML = "";
      _card.style.visibility = "";
      _card.style.top = "";
      _card.style.left = "";
      _card.classList.remove("is-mobile", "is-ready");
    }
  }

  function skip() {
    if (!_active) return;
    if (_isTransfer) {
      localStorage.setItem("gaffer_transfer_tour_done", "1");
    } else {
      localStorage.setItem("gaffer_tour_done", "1");
    }
    cleanup();
  }

  function finish() {
    if (!_active) return;
    if (_isTransfer) {
      localStorage.setItem("gaffer_transfer_tour_done", "1");
    } else {
      localStorage.setItem("gaffer_tour_done", "1");
    }
    cleanup();
  }

  return { start, next, prev, skip, finish, BUILD_STEPS, TRANSFER_STEPS };
})();

window.Tour = Tour;