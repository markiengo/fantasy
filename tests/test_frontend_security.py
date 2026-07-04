from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_auth_overlay_email_is_rendered_as_text_not_html():
    app_js = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")

    assert "function setAuthOverlayBody" in app_js
    assert "strong.textContent = email || \"\";" in app_js
    assert "body.replaceChildren(" in app_js
    assert "authOverlayBody\");" in app_js
    assert "body.innerHTML = t(\"auth.confirmation_sent\")" not in app_js
    assert "body.innerHTML = t(\"auth.reset_link_sent\")" not in app_js