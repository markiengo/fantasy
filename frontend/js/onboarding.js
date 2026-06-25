const Onboarding = (() => {
  const KEY = "gaffer_onboarding_done";

  function close(skipTour) {
    const overlay = document.getElementById("welcome");
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    setTimeout(() => { overlay.hidden = true; }, 300);
    localStorage.setItem(KEY, "1");
    if (skipTour) {
      localStorage.setItem("gaffer_tour_done", "1");
    }
  }

  function open() {
    const overlay = document.getElementById("welcome");
    if (!overlay) return;

    overlay.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-open")));

    const showMeHow = document.getElementById("welcomeShowMeHow");
    const gotIt = document.getElementById("welcomeGotIt");

    if (showMeHow) {
      showMeHow.hidden = true;
    }

    if (gotIt && !gotIt.dataset.bound) {
      gotIt.dataset.bound = "1";
      gotIt.addEventListener("click", () => close(true));
    }

    if (!overlay.dataset.bound) {
      overlay.dataset.bound = "1";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(true);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close(true);
      });
    }

    if (gotIt) gotIt.focus();
  }

  function maybeShow() {
    if (localStorage.getItem(KEY)) return;
    open();
  }

  return { maybeShow, open, close };
})();
window.Onboarding = Onboarding;
