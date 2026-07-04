const Onboarding = (() => {
  const CLOSE_MS = 320;

  function key() {
    return "gaffer_onboarding_done_" + (window._userId || "anon");
  }
  function tourKey() {
    return "gaffer_tour_done_" + (window._userId || "anon");
  }

  function close(options) {
    const settings = options || {};
    const overlay = document.getElementById("welcome");

    if (!overlay || overlay.hidden) {
      if (settings.startTour && window.Tour) {
        requestAnimationFrame(() => Tour.start());
      }
      return Promise.resolve();
    }

    overlay.classList.remove("is-open");
    localStorage.setItem(key(), "1");

    if (settings.skipTour) {
      localStorage.setItem(tourKey(), "1");
    }

    return new Promise((resolve) => {
      window.setTimeout(() => {
        overlay.hidden = true;
        if (settings.startTour && window.Tour) {
          requestAnimationFrame(() => Tour.start());
        }
        resolve();
      }, CLOSE_MS);
    });
  }

  function open() {
    const overlay = document.getElementById("welcome");
    if (!overlay) return;

    overlay.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-open")));

    const showMeHow = document.getElementById("welcomeShowMeHow");
    const gotIt = document.getElementById("welcomeGotIt");

    if (showMeHow && !showMeHow.dataset.bound) {
      showMeHow.dataset.bound = "1";
      showMeHow.addEventListener("click", () => {
        if (typeof switchScreen === "function") switchScreen("team");
        close({ startTour: true });
      });
    }

    if (gotIt && !gotIt.dataset.bound) {
      gotIt.dataset.bound = "1";
      gotIt.addEventListener("click", () => {
        close({ skipTour: true });
      });
    }

    if (!overlay.dataset.bound) {
      overlay.dataset.bound = "1";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close({ skipTour: true });
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close({ skipTour: true });
      });
    }

    if (showMeHow) showMeHow.focus();
  }

  function maybeShow() {
    if (localStorage.getItem(key())) return;
    open();
  }

  return { maybeShow, open, close };
})();

window.Onboarding = Onboarding;
