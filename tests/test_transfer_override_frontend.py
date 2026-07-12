from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_JS = (ROOT / "frontend" / "js" / "app.js").read_text(encoding="utf-8")


def test_override_can_edit_effective_prior_squad_for_target_matchday():
    assert "const isOverrideMatchday = window._transferOverride && md === currentTransferMatchday() - 1;" in APP_JS
    assert "State.squadSaved = squad.matchday === md || isOverrideMatchday;" in APP_JS


def test_override_flag_is_reset_when_profile_does_not_have_override():
    assert "window._transferOverride = Boolean(me.transfer_override);" in APP_JS