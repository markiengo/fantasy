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

def test_shared_escape_helper_is_available_before_render_modules():
    i18n_js = (ROOT / "frontend" / "js" / "i18n.js").read_text(encoding="utf-8")
    index_html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")

    assert "function escapeHtml(value)" in i18n_js
    assert "window.escapeHtml = I18n.escapeHtml;" in i18n_js
    assert index_html.index('src="js/i18n.js"') < index_html.index('src="js/squad.js"')


def test_api_derived_frontend_names_are_escaped_before_html_injection():
    squad_js = (ROOT / "frontend" / "js" / "squad.js").read_text(encoding="utf-8")
    fixtures_js = (ROOT / "frontend" / "js" / "fixtures.js").read_text(encoding="utf-8")
    scores_js = (ROOT / "frontend" / "js" / "scores.js").read_text(encoding="utf-8")
    stats_js = (ROOT / "frontend" / "js" / "stats.js").read_text(encoding="utf-8")

    assert "${escapeHtml(player.name)}" in squad_js
    assert "${escapeHtml(team.name)}" in squad_js
    assert "${escapeHtml(row.name)}" in fixtures_js
    assert "${escapeHtml(t1Name)}" in fixtures_js
    assert "escapeHtml(p.name)" in scores_js
    assert "escapeHtml(xf.player_out_name || t(\"dash.unknown\"))" in scores_js
    assert "${escapeHtml(entry.name)}" in stats_js
    assert "${escapeHtml(err.message || \"\")}" in stats_js


def test_stale_components_page_is_not_shipped():
    assert not (ROOT / "frontend" / "components.html").exists()