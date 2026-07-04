import re
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import auth as auth_module
from app.routers import auth as auth_router
from app.routers import me as me_router


class NeverUsedConn:
    pass


VIETNAMESE_MARKED_USERNAMES = [
    "t\u00e2n",
    "t\u00ean",
    "h\u00e0",
    "\u0111uc",
    "ng\u01b0",
    "th\u01a1",
    "m\u1eb9",
]


@pytest.mark.parametrize("username", VIETNAMESE_MARKED_USERNAMES)
def test_check_username_rejects_vietnamese_accents(username, monkeypatch):
    def fail_if_called(conn, username):
        raise AssertionError("invalid usernames should not hit the database")

    monkeypatch.setattr(auth_router, "check_username_taken", fail_if_called)

    result = auth_router.check_username(username=username, conn=NeverUsedConn())

    assert result == {"available": False, "reason": "invalid"}


def test_check_username_allows_ascii_spaces_and_strips_edges(monkeypatch):
    seen = []

    def fake_check_username_taken(conn, username):
        seen.append(username)
        return False

    monkeypatch.setattr(auth_router, "check_username_taken", fake_check_username_taken)

    result = auth_router.check_username(username="  Tan Nguyen  ", conn=NeverUsedConn())

    assert result == {"available": True, "reason": "ok"}
    assert seen == ["Tan Nguyen"]


@pytest.mark.parametrize("username", VIETNAMESE_MARKED_USERNAMES)
def test_complete_profile_rejects_vietnamese_accents(username, monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    with pytest.raises(HTTPException) as exc:
        me_router.complete_profile_route(
            SimpleNamespace(username=username),
            payload={"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {}},
            conn=NeverUsedConn(),
        )

    assert exc.value.status_code == 400
    assert "spaces only" in exc.value.detail
    assert "No accents or diacritics" in exc.value.detail


def test_complete_profile_allows_ascii_spaces(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)
    monkeypatch.setattr(me_router, "check_username_taken", lambda conn, username: False)

    created = []

    def fake_create_user_from_auth(conn, auth_user_id, username, display_name):
        created.append({"auth_user_id": auth_user_id, "username": username, "display_name": display_name})
        return {"user_id": 1, "username": username, "display_name": display_name, "role": "user"}

    monkeypatch.setattr(me_router, "create_user_from_auth", fake_create_user_from_auth)

    result = me_router.complete_profile_route(
        SimpleNamespace(username="  Tan Nguyen  "),
        payload={"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {}},
        conn=NeverUsedConn(),
    )

    assert result["username"] == "Tan Nguyen"
    assert created[0]["username"] == "Tan Nguyen"


def test_me_does_not_create_user_from_invalid_metadata_username(monkeypatch):
    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    def fail_if_called(conn, auth_user_id, username, display_name):
        raise AssertionError("invalid metadata username must not create a local user")

    monkeypatch.setattr(me_router, "create_user_from_auth", fail_if_called)

    result = me_router.get_me_route(
        payload={
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "tan@example.com",
            "user_metadata": {"username": "t\u00e2n", "name": "Tan"},
        },
        conn=NeverUsedConn(),
    )

    assert result["needs_username"] is True
    assert result["email"] == "tan@example.com"
    assert result["name"] == "Tan"


def test_frontend_username_modal_rejects_non_ascii_usernames():
    app_js = open("frontend/js/app.js", encoding="utf-8").read()
    ascii_space_username = re.compile(r"^[a-zA-Z0-9_ ]{3,20}$")

    assert "/^[a-zA-Z0-9_ ]{3,20}$/" in app_js
    assert ascii_space_username.match("tan")
    assert ascii_space_username.match("Tan Nguyen")
    for username in VIETNAMESE_MARKED_USERNAMES:
        assert not ascii_space_username.match(username)


def test_complete_profile_errors_are_localized_on_frontend():
    app_js = open("frontend/js/app.js", encoding="utf-8").read()
    i18n_js = open("frontend/js/i18n.js", encoding="utf-8").read()

    assert "function usernameProfileErrorMessage(err)" in app_js
    assert "return t(\"username.invalid\");" in app_js
    assert "return t(\"username.taken\");" in app_js
    assert "return t(\"username.profile_completed\");" in app_js
    assert "feedback.textContent = usernameProfileErrorMessage(err);" in app_js
    assert "err.message || t(\"username.could_not_set\")" not in app_js

    assert "username.profile_completed" in i18n_js
    assert "Kh\\u00f4ng d\\u00f9ng d\\u1ea5u ti\\u1ebfng Vi\\u1ec7t" in i18n_js
    assert "d\\u1ea5u c\\u00e1ch" in i18n_js
    assert "T\\u00ean ng\\u01b0\\u1eddi d\\u00f9ng" in i18n_js

def test_current_user_dependency_rejects_invalid_metadata_username(monkeypatch):
    monkeypatch.setattr(auth_module, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    def fail_if_called(conn, auth_user_id, username, display_name):
        raise AssertionError("invalid metadata username must not create a local user")

    monkeypatch.setattr(auth_module, "create_user_from_auth", fail_if_called)

    with pytest.raises(HTTPException) as exc:
        auth_module.get_current_user(
            NeverUsedConn(),
            {
                "sub": "00000000-0000-0000-0000-000000000001",
                "email": "tan@example.com",
                "user_metadata": {"username": "t\u00e2n"},
            },
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Username required"

def test_me_returns_conflict_when_metadata_username_is_taken(monkeypatch):
    from psycopg2.errors import UniqueViolation

    monkeypatch.setattr(me_router, "get_user_by_auth_id", lambda conn, auth_user_id: None)

    def raise_unique(conn, auth_user_id, username, display_name):
        raise UniqueViolation("duplicate username")

    monkeypatch.setattr(me_router, "create_user_from_auth", raise_unique)

    with pytest.raises(HTTPException) as exc:
        me_router.get_me_route(
            payload={
                "sub": "00000000-0000-0000-0000-000000000001",
                "email": "tan@example.com",
                "user_metadata": {"username": "Tan Nguyen", "name": "Tan"},
            },
            conn=NeverUsedConn(),
        )

    assert exc.value.status_code == 409
    assert exc.value.detail == "Username already taken"