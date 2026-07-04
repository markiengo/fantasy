const Progress = (() => {
  let _overlay = null;
  let _ringFill = null;
  let _pctEl = null;
  let _msgEl = null;
  let _current = 0;
  let _timer = null;
  let _msgTimer = null;
  let _hideTimer = null;
  let _msgIdx = 0;

  var RADIUS = 52;
  var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  var QUIPS = [
    function () { return t("progress.quip_1"); },
    function () { return t("progress.quip_2"); },
    function () { return t("progress.quip_3"); },
    function () { return t("progress.quip_4"); },
    function () { return t("progress.quip_5"); },
    function () { return t("progress.quip_6"); },
    function () { return t("progress.quip_7"); },
    function () { return t("progress.quip_8"); },
    function () { return t("progress.quip_9"); },
    function () { return t("progress.quip_10"); },
    function () { return t("progress.quip_11"); },
    function () { return t("progress.quip_12"); },
  ];

  function _cache() {
    _overlay = document.getElementById("loadingOverlay");
    _ringFill = document.getElementById("loadingRingFill");
    _pctEl = document.getElementById("loadingRingPct");
    _msgEl = document.getElementById("loadingOverlayMsg");
    var stops = document.querySelectorAll("#loadingGradient stop");
    if (stops.length >= 2) {
      var cs = getComputedStyle(document.documentElement);
      stops[0].setAttribute("stop-color", cs.getPropertyValue("--accent").trim() || "#b8e850");
      stops[1].setAttribute("stop-color", cs.getPropertyValue("--accent-2").trim() || "#9cd838");
    }
  }

  function _setRing(percent) {
    if (!_ringFill) return;
    var offset = CIRCUMFERENCE * (1 - percent / 100);
    _ringFill.style.strokeDashoffset = offset;
  }

  function _nextQuip() {
    if (!_msgEl) return;
    _msgEl.style.opacity = "0";
    setTimeout(function () {
      var quip = QUIPS[_msgIdx % QUIPS.length];
      _msgEl.textContent = typeof quip === "function" ? quip() : quip;
      _msgIdx++;
      _msgEl.style.opacity = "1";
    }, 200);
  }

  function start() {
    if (!_overlay) _cache();
    if (!_overlay) return;
    _current = 0;
    _overlay.hidden = false;
    _ringFill.style.strokeDasharray = CIRCUMFERENCE;
    _setRing(0);
    _pctEl.textContent = "0%";
    _msgIdx = 0;
    _nextQuip();
    if (_timer) clearInterval(_timer);
    if (_msgTimer) clearInterval(_msgTimer);
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    _timer = setInterval(function () {
      if (_current < 85) {
        _current += Math.random() * 12;
        if (_current > 85) _current = 85;
        _setRing(_current);
        _pctEl.textContent = Math.round(_current) + "%";
      }
    }, 250);
    _msgTimer = setInterval(_nextQuip, 2000);
  }

  function set(percent) {
    _current = Math.min(percent, 100);
    _setRing(_current);
    if (_pctEl) _pctEl.textContent = Math.round(_current) + "%";
  }

  function done() {
    if (_timer) clearInterval(_timer);
    if (_msgTimer) clearInterval(_msgTimer);
    _timer = null;
    _msgTimer = null;
    set(100);
    var el = _overlay;
    _hideTimer = setTimeout(function () {
      if (el) el.hidden = true;
      _hideTimer = null;
    }, 400);
  }

  return { start: start, set: set, done: done };
})();
