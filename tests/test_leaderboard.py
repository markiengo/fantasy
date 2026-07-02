import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.auth import get_current_user


# ---------------------------------------------------------------------------
# Fake cursor / connection helpers
# ---------------------------------------------------------------------------

class FakeCursor:
    """Mimics psycopg2 RealDictCursor — returns pre-seeded dicts."""

    def __init__(self, rows):
        self._rows = rows
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchall(self):
        return self._rows

    def close(self):
        pass


class FakeConn:
    def __init__(self, rows):
        self._rows = rows
        self._cursor = FakeCursor(rows)

    def cursor(self):
        return self._cursor


# ---------------------------------------------------------------------------
# Query-level tests
# ---------------------------------------------------------------------------

def test_cumulative_returns_all_users():
    rows = [
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 50},
        {"user_id": 2, "username": "bob", "display_name": "Bob", "squad_score": 40},
    ]
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    result = get_leaderboard(conn)

    assert len(result) == 2
    assert result[0]["username"] == "alice"
    assert result[0]["squad_score"] == 50
    assert result[0]["rank"] == 1
    assert result[1]["rank"] == 2


def test_matchday_filter_passes_param():
    rows = [
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 20},
    ]
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    result = get_leaderboard(conn, matchday=3)

    assert len(result) == 1
    cursor = conn.cursor()
    # params are (prev_md, matchday) = (2, 3)
    sql, params = cursor.executed[-1]
    assert params == (2, 3)


def test_cumulative_no_params():
    rows = []
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.cursor()
    sql, params = cursor.executed[-1]
    assert params is None


def test_empty_result_returns_empty_list():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    result = get_leaderboard(conn)

    assert result == []


def test_sql_contains_captain_doubling():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.cursor()
    sql, _ = cursor.executed[-1]
    assert "is_captain" in sql
    assert "* 2" in sql


def test_sql_contains_active_user_filter():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.cursor()
    sql, _ = cursor.executed[-1]
    assert "is_active = true" in sql


def test_sql_contains_matchday_join():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.cursor()
    sql, _ = cursor.executed[-1]
    assert "m.matchday = s.matchday" in sql


def test_sql_contains_tie_breaker():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.cursor()
    sql, _ = cursor.executed[-1]
    assert "u.user_id ASC" in sql


def test_matchday_sql_contains_tie_breaker():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn, matchday=1)

    cursor = conn.cursor()
    sql, _ = cursor.executed[-1]
    assert "u.user_id ASC" in sql


# ---------------------------------------------------------------------------
# Route-level tests
# ---------------------------------------------------------------------------

def fake_user():
    return {"user_id": 17, "username": "markiengo", "display_name": "Mark", "is_active": True, "role": "user"}


def fake_db_factory(rows):
    """Returns a generator function compatible with FastAPI Depends."""
    def _get_db():
        yield FakeConn(rows)
    return _get_db


def setup_client(rows, auth_user=None):
    """Create a TestClient with mocked db and auth."""
    if auth_user is None:
        auth_user = fake_user()

    app.dependency_overrides[get_db] = fake_db_factory(rows)
    app.dependency_overrides[get_current_user] = lambda: auth_user
    client = TestClient(app)
    return client


def teardown_client():
    app.dependency_overrides = {}


def test_route_401_without_auth():
    # Override auth to raise 401
    from fastapi import HTTPException, status

    def raise_401():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    app.dependency_overrides[get_db] = fake_db_factory([])
    app.dependency_overrides[get_current_user] = raise_401
    client = TestClient(app)

    response = client.get("/api/leaderboard")
    assert response.status_code == 401

    teardown_client()


def test_route_200_cumulative():
    rows = [
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 50},
        {"user_id": 17, "username": "markiengo", "display_name": "Mark", "squad_score": 40},
    ]
    client = setup_client(rows)

    response = client.get("/api/leaderboard")
    assert response.status_code == 200

    data = response.json()
    assert "entries" in data
    assert "my_user_id" in data
    assert data["my_user_id"] == 17
    assert len(data["entries"]) == 2
    assert data["entries"][0]["rank"] == 1
    assert data["entries"][0]["username"] == "alice"
    assert data["entries"][0]["squad_score"] == 50
    assert "matchday" not in data

    teardown_client()


def test_route_200_filtered():
    rows = [
        {"user_id": 17, "username": "markiengo", "display_name": "Mark", "squad_score": 31},
    ]
    client = setup_client(rows)

    response = client.get("/api/leaderboard?matchday=3")
    assert response.status_code == 200

    data = response.json()
    assert data["matchday"] == 3
    assert "entries" in data
    assert data["my_user_id"] == 17
    assert len(data["entries"]) == 1
    assert data["entries"][0]["rank"] == 1
    assert data["entries"][0]["squad_score"] == 31

    teardown_client()


def test_route_200_empty():
    client = setup_client([])

    response = client.get("/api/leaderboard")
    assert response.status_code == 200

    data = response.json()
    assert data["entries"] == []
    assert data["my_user_id"] == 17

    teardown_client()


def test_route_200_empty_with_matchday():
    client = setup_client([])

    response = client.get("/api/leaderboard?matchday=5")
    assert response.status_code == 200

    data = response.json()
    assert data["entries"] == []
    assert data["matchday"] == 5
    assert data["my_user_id"] == 17

    teardown_client()


def test_route_ranks_sequential():
    rows = [
        {"user_id": 3, "username": "carol", "display_name": "Carol", "squad_score": 60},
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 50},
        {"user_id": 2, "username": "bob", "display_name": "Bob", "squad_score": 40},
    ]
    client = setup_client(rows)

    response = client.get("/api/leaderboard")
    data = response.json()

    assert data["entries"][0]["rank"] == 1
    assert data["entries"][1]["rank"] == 2
    assert data["entries"][2]["rank"] == 3

    teardown_client()


def test_route_my_user_id_correct():
    rows = [
        {"user_id": 99, "username": "other", "display_name": "Other", "squad_score": 10},
    ]
    auth_user = {"user_id": 42, "username": "testuser", "display_name": "Test", "is_active": True, "role": "user"}
    client = setup_client(rows, auth_user=auth_user)

    response = client.get("/api/leaderboard")
    data = response.json()

    assert data["my_user_id"] == 42

    teardown_client()
