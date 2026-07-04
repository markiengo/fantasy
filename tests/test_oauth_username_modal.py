from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_google_username_modal_is_not_hidden_with_login_screen():
    index_html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    app_js = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

    assert 'id="usernameModal"' in index_html
    assert index_html.index('id="usernameModal"') < index_html.index('<!-- APP SCREEN -->')

    function_start = app_js.index("function showUsernameModal(profile)")
    function_end = app_js.index("function hideUsernameModal(options)", function_start)
    modal_block = app_js[function_start:function_end]

    reparent_index = modal_block.index("document.body.appendChild(modal)")
    hide_login_index = modal_block.index('login.style.display = "none"')

    assert reparent_index < hide_login_index
    assert 'modal.style.display = "flex"' in modal_block


def test_username_modal_submit_reenters_app_without_inner_boot_closure():
    app_js = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

    function_start = app_js.index("function showUsernameModal(profile)")
    function_end = app_js.index("function hideUsernameModal(options)", function_start)
    modal_block = app_js[function_start:function_end]

    assert 'form.dataset.usernameSubmitBound !== "1"' in modal_block
    assert "await enterAuthenticatedApp();" in modal_block
    assert "await swapToApp();" not in modal_block

def test_username_gate_blocks_app_until_profile_completion():
    app_js = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

    assert "var _usernameGateLocked = false;" in app_js
    assert "function enforceUsernameGate(profile)" in app_js
    assert "function setAppGateInert(locked)" in app_js
    assert "app.inert = true;" in app_js

    switch_start = app_js.index("function switchScreen(name)")
    switch_end = app_js.index("function _doSwitchScreen(name)", switch_start)
    switch_block = app_js[switch_start:switch_end]

    assert "if (_usernameGateLocked)" in switch_block
    assert "enforceUsernameGate();" in switch_block
    assert "return;" in switch_block


def test_username_modal_cannot_hide_before_completion():
    app_js = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

    hide_start = app_js.index("function hideUsernameModal(options)")
    hide_end = app_js.index("function showAppScreen()", hide_start)
    hide_block = app_js[hide_start:hide_end]

    assert "if (_usernameGateLocked && (!options || options.completed !== true))" in hide_block
    assert "enforceUsernameGate();" in hide_block
    assert "return;" in hide_block
    assert "_usernameGateLocked = false;" in hide_block

    modal_start = app_js.index("function showUsernameModal(profile)")
    modal_end = app_js.index("function hideUsernameModal(options)", modal_start)
    modal_block = app_js[modal_start:modal_end]

    assert "_usernameGateLocked = true;" in modal_block
    assert "setAppGateInert(true);" in modal_block
    assert "hideUsernameModal({ completed: true });" in modal_block