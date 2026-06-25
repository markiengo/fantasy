const Tour = (() => {
  const MOBILE_BREAK = 760;

  const BUILD_STEPS = [
    {
      target: "#pitch",
      title: "Build your XI",
      body: "This is your pitch. You need 11 players in a 4-3-3 or 4-4-2 shape. Tap any empty slot to filter the pool by position.",
      mobileTab: "pitch",
    },
    {
      target: ".pool",
      title: "Pick your players",
      body: "Browse and filter players here. Click the + button on any row to add them to your squad.",
      mobileTab: "players",
    },
    {
      target: "#statRemaining",
      title: "Watch the budget",
      body: "You have $50m to spend. This meter tracks how much you've used and what's left.",
      mobileTab: "summary",
      preferred: ".stat-tile--accent",
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
      body: "Tap this icon anytime to see how fantasy points are calculated for each position — goals, assists, clean sheets, cards.",
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
      body: "Click the × on any player token to remove them from your squad. This frees up a slot and budget.",
      mobileTab: "pitch",
    },
    {
      target: ".pool",
      title: "Add a replacement",
      body: "Pick a new player from the pool. They must fit the same position slot and stay within budget.",
      mobileTab: "players",
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
  let _active = false;
  let _isTransfer = false;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAK;
  }

  function ensureDOM() {
    if (_overlay) return;

    _overlay = document.createElement("div");
    _overlay.className = "tour-overlay";

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
      if (e.target === _overlay) skip();
    });

    document.addEventListener("keydown", (e) => {
      if (!_active) return;
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    });

    window.addEventListener("resize", () => {
      if (_active) positionSpotlight();
    }, { passive: true });

    window.addEventListener("scroll", () => {
      if (_active) positionSpotlight();
    }, { passive: true });
  }

  function resolveTarget(step) {
    let el = null;
    if (step.preferred) {
      el = document.querySelector(step.preferred);
    }
    if (!el) {
      el = document.querySelector(step.target);
    }
    if (!el && step.target === "#saveSquadBtn") {
      el = document.querySelector(".summary-actions .btn--primary");
    }
    if (!el && step.target === "#confirmBtn") {
      el = document.querySelector(".summary-actions .btn--primary");
    }
    return el;
  }

  let _firstShow = true;

  function positionSpotlight() {
    const step = _steps[_index];
    if (!step) return;
    const target = resolveTarget(step);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const pad = 4;

    const top = rect.top - pad;
    const left = rect.left - pad;
    const right = rect.right + pad;
    const bottom = rect.bottom + pad;

    if (_firstShow) {
      _spotlight.style.transition = "none";
      _firstShow = false;
    } else {
      _spotlight.style.transition = "";
    }

    _spotlight.style.top = top + "px";
    _spotlight.style.left = left + "px";
    _spotlight.style.width = (right - left) + "px";
    _spotlight.style.height = (bottom - top) + "px";
    _spotlight.style.borderRadius = window.getComputedStyle(target).borderRadius;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = right - left;
    const h = bottom - top;
    const radius = parseFloat(window.getComputedStyle(target).borderRadius) || 0;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + vw + '" height="' + vh + '" viewBox="0 0 ' + vw + ' ' + vh + '">' +
      '<defs><mask id="tourHole">' +
      '<rect width="100%" height="100%" fill="white"/>' +
      '<rect x="' + left + '" y="' + top + '" width="' + w + '" height="' + h + '" rx="' + radius + '" fill="black"/>' +
      '</mask></defs>' +
      '<rect width="100%" height="100%" fill="white" mask="url(#tourHole)"/>' +
      '</svg>';
    const maskUrl = "url('data:image/svg+xml;utf8," + encodeURIComponent(svg) + "')";
    _overlay.style.maskImage = maskUrl;
    _overlay.style.webkitMaskImage = maskUrl;
    _overlay.style.maskRepeat = "no-repeat";
    _overlay.style.webkitMaskRepeat = "no-repeat";
    _overlay.style.maskSize = "100% 100%";
    _overlay.style.webkitMaskSize = "100% 100%";
    _overlay.style.clipPath = "none";
    _overlay.style.webkitClipPath = "none";

    if (!isMobile()) {
      positionCardDesktop(rect);
    }
  }

  function positionCardDesktop(targetRect) {
    const cardRect = _card.getBoundingClientRect();
    const margin = 16;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const cardW = cardRect.width || 280;
    const cardH = cardRect.height || 140;

    let top;
    const spaceBelow = viewportH - (targetRect.bottom + margin + cardH);
    const spaceAbove = targetRect.top - margin - cardH;

    if (spaceBelow >= 0) {
      top = targetRect.bottom + margin;
    } else if (spaceAbove >= 0) {
      top = targetRect.top - margin - cardH;
    } else {
      top = Math.max(margin, (viewportH - cardH) / 2);
    }

    let left = targetRect.left + (targetRect.width / 2) - (cardW / 2);
    left = Math.max(margin, Math.min(left, viewportW - cardW - margin));

    _card.style.top = top + "px";
    _card.style.left = left + "px";
  }

  function switchMobileTab(tab) {
    if (!tab || !isMobile()) return;
    if (typeof setTeamPane === "function") {
      setTeamPane(tab);
    }
  }

  function renderCard() {
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

  function showStep() {
    const step = _steps[_index];
    if (!step) return;

    switchMobileTab(step.mobileTab);

    requestAnimationFrame(() => {
      const target = resolveTarget(step);
      if (!target) {
        if (_index < _steps.length - 1) {
          _index = _index + 1;
          showStep();
          return;
        } else {
          finish();
          return;
        }
      }

      target.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });

      requestAnimationFrame(() => {
        positionSpotlight();
        renderCard();

        if (isMobile()) {
          _card.classList.add("is-mobile");
          _card.style.top = "";
          _card.style.left = "";
        } else {
          _card.classList.remove("is-mobile");
        }

        _overlay.classList.add("is-visible");

        requestAnimationFrame(() => {
          positionSpotlight();
        });
      });
    });
  }

  const ENABLED = false;

  function start(steps) {
    if (!ENABLED || _active) return;
    _steps = steps || BUILD_STEPS;
    _isTransfer = _steps === TRANSFER_STEPS;
    _index = 0;
    _active = true;
    _firstShow = true;
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

  function cleanup() {
    _active = false;
    _index = 0;
    _isTransfer = false;
    if (_overlay) {
      _overlay.classList.remove("is-visible");
      setTimeout(() => {
        if (_overlay && _overlay.parentNode) {
          _overlay.parentNode.removeChild(_overlay);
        }
        _overlay = null;
        _spotlight = null;
        _card = null;
      }, 200);
    }
  }

  return { start, next, prev, skip, finish, BUILD_STEPS, TRANSFER_STEPS };
})();
window.Tour = Tour;
