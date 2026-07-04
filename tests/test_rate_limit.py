from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.rate_limit import clear_rate_limits, enforce_rate_limit


class Headers(dict):
    def get(self, key, default=None):
        return super().get(key, default)


def make_request(ip):
    return SimpleNamespace(headers=Headers({"x-forwarded-for": ip}), client=SimpleNamespace(host="fallback"))


def test_rate_limit_blocks_after_limit_for_same_client_and_action():
    clear_rate_limits()
    request = make_request("203.0.113.10")

    enforce_rate_limit(request, "auth-login", 2, 60)
    enforce_rate_limit(request, "auth-login", 2, 60)

    with pytest.raises(HTTPException) as exc:
        enforce_rate_limit(request, "auth-login", 2, 60)

    assert exc.value.status_code == 429
    assert exc.value.detail == "Too many attempts. Try again later."


def test_rate_limit_separates_actions_and_clients():
    clear_rate_limits()

    enforce_rate_limit(make_request("203.0.113.10"), "auth-login", 1, 60)
    enforce_rate_limit(make_request("203.0.113.11"), "auth-login", 1, 60)
    enforce_rate_limit(make_request("203.0.113.10"), "check-username", 1, 60)