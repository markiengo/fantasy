/* ============================================================================
   onboarding.js — first-launch welcome overlay. Shows a liquid-glass card with
   the five key rules the very first time someone opens the app, then remembers
   the dismissal in sessionStorage so it never nags on return visits.
   ============================================================================ */

const Onboarding = (() => {
  const seenKey = "wcf_onboarded";

  function close() {
    const overlay = document.getElementById("welcome");
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    // wait for the exit transition before pulling it out of the layout / a11y tree
    setTimeout(() => { overlay.hidden = true; }, 300);
    try { sessionStorage.setItem(seenKey, "1"); } catch (e) { /* private mode — show again, no harm */ }
    
    // Show toast message about demo squad
    if (window.Toast) {
      Toast.show("A squad has been imported for demo purposes", "info", 5000);
    }
  }

  function open() {
    const overlay = document.getElementById("welcome");
    if (!overlay) return;
    overlay.hidden = false;
    // double rAF: paint the hidden state first, then release so the entrance transitions
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-open")));
    document.getElementById("welcomeStart").addEventListener("click", close);
    // dismiss on Escape or click outside the card, like the modals
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.getElementById("welcomeStart").focus();
  }

  function maybeShow() {
    let seen = false;
    try { seen = sessionStorage.getItem(seenKey) === "1"; } catch (e) { /* ignore */ }
    if (!seen) open();
  }

  return { maybeShow, open, close };
})();
window.Onboarding = Onboarding;
