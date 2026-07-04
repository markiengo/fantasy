from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import auth as auth_module
from app.routers import me as me_router
from app.schemas import CompleteProfileRequest


class NeverUsedConn:
    pass


SHORT_NAMES = ["a", "", "x"]


@pytest.mark.parametrize("name", SHORT_NAMES)
def test_complete_profile_rejects_short_names(name, monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    with pytest.raises(HTTPException) as exc:
        me_router.complete_profile_route(
            CompleteProfileRequest(display_name=name),
            request=None,
            payload={"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {}},
            conn=NeverUsedConn(),
        )

    assert exc.value.status_code == 400


def test_complete_profile_rejects_too_long(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    with pytest.raises(HTTPException) as exc:
        me_router.complete_profile_route(
            CompleteProfileRequest(display_name="x" * 31),
            request=None,
            payload={"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {}},
            conn=NeverUsedConn(),
        )

    assert exc.value.status_code == 400


def test_complete_profile_allows_valid_display_name(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)
    monkeypatch.setattr(me_router, "check_username_taken", lambda conn, username: False)

    created = []

    def fake_create_user_from_auth(conn, auth_user_id, username, display_name):
        created.append({"auth_user_id": auth_user_id, "username": username, "display_name": display_name})
        return {"user_id": 1, "username": username, "display_name": display_name, "role": "user"}

    monkeypatch.setattr(me_router, "create_user_from_auth", fake_create_user_from_auth)

    result = me_router.complete_profile_route(
        CompleteProfileRequest(display_name="Tan Nguyen"),
        request=None,
        payload={"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {}},
        conn=NeverUsedConn(),
    )

    assert result["display_name"] == "Tan Nguyen"
    assert created[0]["display_name"] == "Tan Nguyen"


def test_complete_profile_rejects_already_completed(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: {"user_id": 1})

    with pytest.raises(HTTPException) as exc:
        me_router.complete_profile_route(
            CompleteProfileRequest(display_name="Tan"),
            request=None,
            payload={"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {}},
            conn=NeverUsedConn(),
        )

    assert exc.value.status_code == 409


def test_me_does_not_create_user_from_short_metadata_name(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    def fail_if_called(conn, auth_user_id, username, display_name):
        raise AssertionError("short metadata name must not create a local user")

    monkeypatch.setattr(me_router, "create_user_from_auth", fail_if_called)

    result = me_router.get_me_route(
        payload={
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "tan@example.com",
            "user_metadata": {"display_name": "a", "name": "a"},
        },
        conn=NeverUsedConn(),
    )

    assert result["needs_username"] is True
    assert result["email"] == "tan@example.com"


def test_me_creates_user_from_valid_metadata_name(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)
    monkeypatch.setattr(me_router, "check_username_taken", lambda conn, username: False)

    created = []

    def fake_create(conn, auth_user_id, username, display_name):
        created.append({"username": username, "display_name": display_name})
        return {"user_id": 1, "username": username, "display_name": display_name, "role": "user"}

    monkeypatch.setattr(me_router, "create_user_from_auth", fake_create)

    result = me_router.get_me_route(
        payload={
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "tan@example.com",
            "user_metadata": {"display_name": "Tan Nguyen", "name": "Tan"},
        },
        conn=NeverUsedConn(),
    )

    assert result["user_id"] == 1
    assert result["display_name"] == "Tan Nguyen"


def test_current_user_rejects_missing_local_user(monkeypatch):
    monkeypatch.setattr(auth_module, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    with pytest.raises(HTTPException) as exc:
        auth_module.get_current_user(
            NeverUsedConn(),
            {
                "sub": "00000000-0000-0000-0000-000000000001",
                "email": "tan@example.com",
                "user_metadata": {"display_name": "Tan"},
            },
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Username required"


def test_me_returns_conflict_when_metadata_username_is_taken(monkeypatch):
    from psycopg2.errors import UniqueViolation

    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)
    monkeypatch.setattr(me_router, "check_username_taken", lambda conn, username: False)

    def raise_unique(conn, auth_user_id, username, display_name):
        raise UniqueViolation("duplicate username")

    monkeypatch.setattr(me_router, "create_user_from_auth", raise_unique)

    with pytest.raises(HTTPException) as exc:
        me_router.get_me_route(
            payload={
                "sub": "00000000-0000-0000-0000-000000000001",
                "email": "tan@example.com",
                "user_metadata": {"display_name": "Tan Nguyen", "name": "Tan"},
            },
            conn=NeverUsedConn(),
        )

    assert exc.value.status_code == 409
    assert exc.value.detail == "Username already taken"


def test_frontend_username_modal_validates_display_name_length():
    app_js = open("frontend/js/app.js", encoding="utf-8").read()

    assert "displayName.length < 2 || displayName.length > 30" in app_js


def test_complete_profile_errors_are_localized_on_frontend():
    app_js = open("frontend/js/app.js", encoding="utf-8").read()
    i18n_js = open("frontend/js/i18n.js", encoding="utf-8").read()

    assert "function usernameProfileErrorMessage(err)" in app_js
    assert 'return t("username.invalid");' in app_js
    assert 'return t("username.taken");' in app_js
    assert 'return t("username.profile_completed");' in app_js
    assert "feedback.textContent = usernameProfileErrorMessage(err);" in app_js

    assert "username.profile_completed" in i18n_js
