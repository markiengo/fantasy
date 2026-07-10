const Account = (() => {
  const AVATAR_SEED_KEY = "gaffer_avatar_seed";
  const BG_COLORS = "ffd5dc,e6d4f0,c4f0e8,ffe8c4,d4e8ff";
  const AVATAR_SEEDS = ["Gaffer", "Striker", "Playmaker", "Keeper", "Legend", "Captain"];

  let _accountData = null;
  let _emailFetching = false;

  function prepopulate(me) {
    if (!_accountData) {
      _accountData = {
        user_id: me.user_id,
        username: me.username,
        display_name: me.display_name,
        role: me.role,
        email: null,
      };
    }
  }

  function _fetchEmail() {
    if (_emailFetching) return;
    if (_accountData && _accountData.email !== null) return;
    _emailFetching = true;
    Api.getAccount().then(function (info) {
      _accountData = Object.assign({}, _accountData, info);
      _emailFetching = false;
      var emailEl = document.getElementById("accountEmail");
      if (emailEl) emailEl.textContent = info.email || "-";
    }).catch(function () {
      _emailFetching = false;
    });
  }

  function _avatarUrl(seed) {
    return "url('https://api.dicebear.com/9.x/personas/svg?seed=" +
      encodeURIComponent(seed).replace(/'/g, "%27") +
      "&backgroundColor=" + BG_COLORS + "&radius=50')";
  }

  function _getStoredSeed() {
    return localStorage.getItem(AVATAR_SEED_KEY) || null;
  }

  function _setStoredSeed(seed) {
    localStorage.setItem(AVATAR_SEED_KEY, seed);
  }

  function _resolveSeed(displayName) {
    return _getStoredSeed() || displayName || "Gaffer";
  }

  function _renderAvatarPicker(selectedSeed) {
    const container = document.getElementById("avatarPicker");
    if (!container) return;
    container.innerHTML = "";

    for (let i = 0; i < AVATAR_SEEDS.length; i++) {
      const seed = AVATAR_SEEDS[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-pick" + (seed === selectedSeed ? " is-selected" : "");
      btn.style.backgroundImage = _avatarUrl(seed);
      btn.setAttribute("aria-label", seed);
      btn.addEventListener("click", function () {
        _setStoredSeed(seed);
        _highlightPick(seed);
        _updateAvatarImages(seed);
      });
      container.appendChild(btn);
    }
  }

  function _highlightPick(seed) {
    const picks = document.querySelectorAll(".avatar-pick");
    for (let i = 0; i < picks.length; i++) {
      picks[i].classList.toggle("is-selected", picks[i].getAttribute("aria-label") === seed);
    }
  }

  function _updateAvatarImages(seed) {
    const accountAvatar = document.getElementById("accountAvatar");
    if (accountAvatar) accountAvatar.style.backgroundImage = _avatarUrl(seed);

    const managerAvatar = document.getElementById("managerAvatar");
    if (managerAvatar) managerAvatar.style.backgroundImage = _avatarUrl(seed);
  }

  function render() {
    if (!_accountData) {
      Toast.show(t("account.load_failed"), "error");
      return;
    }

    var data = _accountData;
    var seed = _resolveSeed(data.display_name);

    var accountAvatar = document.getElementById("accountAvatar");
    if (accountAvatar) accountAvatar.style.backgroundImage = _avatarUrl(seed);

    _renderAvatarPicker(_getStoredSeed() || data.display_name || "Gaffer");

    var nameInput = document.getElementById("accountNameInput");
    if (nameInput) nameInput.value = data.display_name || "";

    var usernameEl = document.getElementById("accountUsername");
    if (usernameEl) usernameEl.textContent = data.username || "-";

    var emailEl = document.getElementById("accountEmail");
    if (emailEl) emailEl.textContent = data.email || "...";

    var roleEl = document.getElementById("accountRole");
    if (roleEl) {
      var roleText = data.role === "admin" ? t("account.role_admin") : t("account.role_user");
      roleEl.textContent = roleText;
      roleEl.classList.toggle("is-admin", data.role === "admin");
    }

    var userIdEl = document.getElementById("accountUserId");
    if (userIdEl) userIdEl.textContent = data.user_id != null ? String(data.user_id) : "-";

    if (data.email === null) _fetchEmail();
  }

  function bind() {
    const form = document.getElementById("accountNameForm");
    if (form && form.dataset.bound !== "1") {
      form.dataset.bound = "1";
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const input = document.getElementById("accountNameInput");
        const saveBtn = document.getElementById("accountSaveBtn");
        if (!input || !saveBtn) return;

        const name = input.value.trim();
        if (name.length < 2 || name.length > 30) {
          Toast.show(t("account.name_invalid"), "error");
          return;
        }

        saveBtn.disabled = true;
        saveBtn.classList.add("btn--loading");

        try {
          const updated = await Api.updateDisplayName(name);
          _accountData = Object.assign({}, _accountData, updated);

          const profileName = document.querySelector(".profile__name");
          if (profileName) profileName.textContent = updated.display_name;

          const storedSeed = _getStoredSeed();
          if (!storedSeed) {
            _updateAvatarImages(updated.display_name);
          }

          Toast.show(t("account.name_saved"), "success");
        } catch (err) {
          Toast.show(err.message || t("account.save_failed"), "error");
        } finally {
          saveBtn.disabled = false;
          saveBtn.classList.remove("btn--loading");
        }
      });
    }

    const logoutBtn = document.getElementById("accountLogoutBtn");
    if (logoutBtn && logoutBtn.dataset.bound !== "1") {
      logoutBtn.dataset.bound = "1";
      logoutBtn.addEventListener("click", async function () {
        try {
          localStorage.removeItem("wcf2026");
          await window.signOut();
          window.location.reload();
        } catch (err) {
          Toast.show(err.message || t("toast.signout_failed"), "error");
        }
      });
    }
  }

  function reset() {
    _accountData = null;
  }

  return { render, bind, reset, prepopulate };
})();
