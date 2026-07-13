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
        self._fetch_idx = 0

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchall(self):
        return self._rows

    def fetchone(self):
        if self._fetch_idx < len(self._rows):
            row = self._rows[self._fetch_idx]
            self._fetch_idx += 1
            return row
        return None

    def close(self):
        pass


class FakeConn:
    def __init__(self, rows, cursor_rows=None):
        self._rows = rows
        self._cursor_rows = cursor_rows or []
        self._call_idx = 0
        self._cursors = []

    def cursor(self):
        idx = self._call_idx
        self._call_idx += 1
        if idx < len(self._cursor_rows):
            c = FakeCursor(self._cursor_rows[idx])
        else:
            c = FakeCursor(self._rows)
        self._cursors.append(c)
        return c

    def last_cursor(self):
        return self._cursors[-1] if self._cursors else None


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
    cursor = conn.last_cursor()
    # params are (prev_md, matchday, matchday, matchday) = (2, 3, 3, 3)
    sql, params = cursor.executed[-1]
    assert params == (2, 3, 3, 3)


def test_cumulative_no_params():
    rows = []
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.last_cursor()
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

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "is_captain" in sql
    assert "* 2" in sql


def test_sql_contains_active_user_filter():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "is_active = true" in sql


def test_sql_contains_matchday_join():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "m.matchday = s.matchday" in sql


def test_sql_contains_tie_breaker():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "u.user_id ASC" in sql


def test_matchday_sql_contains_tie_breaker():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn, matchday=1)

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "u.user_id ASC" in sql


def test_sql_contains_transfer_count_tiebreak():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn)

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "transfer_count" in sql
    assert "tc.transfer_count ASC" in sql


def test_matchday_sql_contains_transfer_count_tiebreak():
    conn = FakeConn([])

    from app.queries.leaderboard import get_leaderboard
    get_leaderboard(conn, matchday=2)

    cursor = conn.last_cursor()
    sql, _ = cursor.executed[-1]
    assert "transfer_count" in sql
    assert "tc.transfer_count ASC" in sql


def test_format_entries_includes_transfer_count():
    rows = [
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 50, "transfer_count": 3},
        {"user_id": 2, "username": "bob", "display_name": "Bob", "squad_score": 40, "transfer_count": 0},
    ]
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    result = get_leaderboard(conn)

    assert result[0]["transfer_count"] == 3
    assert result[1]["transfer_count"] == 0


def test_format_entries_transfer_count_defaults_to_zero():
    rows = [
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 50},
    ]
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    result = get_leaderboard(conn)

    assert result[0]["transfer_count"] == 0


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


def setup_client(rows, auth_user=None, cursor_rows=None):
    """Create a TestClient with mocked db and auth."""
    if auth_user is None:
        auth_user = fake_user()

    conn = FakeConn(rows, cursor_rows)
    def _get_db():
        yield conn
    app.dependency_overrides[get_db] = _get_db
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
    # cursor_rows: [leaderboard, matchdays, latest_md fetchone, popular_players]
    cursor_rows = [rows, [], [{"md": 1}], []]
    client = setup_client(rows, cursor_rows=cursor_rows)

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
    # cursor_rows: [leaderboard, matchdays, popular_players] (no _latest_matchday when matchday is provided)
    cursor_rows = [rows, [], []]
    client = setup_client(rows, cursor_rows=cursor_rows)

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
    cursor_rows = [[], [], [{"md": 1}], []]
    client = setup_client([], cursor_rows=cursor_rows)

    response = client.get("/api/leaderboard")
    assert response.status_code == 200

    data = response.json()
    assert data["entries"] == []
    assert data["my_user_id"] == 17

    teardown_client()


def test_route_200_empty_with_matchday():
    # cursor_rows: [leaderboard, matchdays, popular_players] (no _latest_matchday when matchday is provided)
    cursor_rows = [[], [], []]
    client = setup_client([], cursor_rows=cursor_rows)

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
    cursor_rows = [rows, [], [{"md": 1}], []]
    client = setup_client(rows, cursor_rows=cursor_rows)

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
    cursor_rows = [rows, [], [{"md": 1}], []]
    client = setup_client(rows, auth_user=auth_user, cursor_rows=cursor_rows)

    response = client.get("/api/leaderboard")
    data = response.json()

    assert data["my_user_id"] == 42

    teardown_client()

def test_round_points_filter_passes_exact_matchday_params():
    rows = [
        {"user_id": 1, "username": "alice", "display_name": "Alice", "squad_score": 20},
    ]
    conn = FakeConn(rows)

    from app.queries.leaderboard import get_leaderboard
    result = get_leaderboard(conn, matchday=3, cumulative=False)

    assert len(result) == 1
    assert result[0]["delta"] is None
    cursor = conn.last_cursor()
    sql, params = cursor.executed[-1]
    assert params == (3, 3)
    assert "t.matchday = %s" in sql
    assert "s.matchday = %s" in sql


def test_route_200_round_points():
    rows = [
        {"user_id": 17, "username": "markiengo", "display_name": "Mark", "squad_score": 14},
    ]
    cursor_rows = [rows, [], []]
    client = setup_client(rows, cursor_rows=cursor_rows)

    response = client.get("/api/leaderboard?matchday=3&cumulative=false")
    assert response.status_code == 200

    data = response.json()
    assert data["matchday"] == 3
    assert len(data["entries"]) == 1
    assert data["entries"][0]["squad_score"] == 14
    assert data["entries"][0]["delta"] is None

    teardown_client()


def test_route_can_skip_optional_metadata():
    rows = [
        {"user_id": 17, "username": "markiengo", "display_name": "Mark", "squad_score": 31},
    ]
    client = setup_client(rows, cursor_rows=[rows])

    response = client.get("/api/leaderboard?matchday=5&cumulative=false&include_meta=false")

    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert "available_matchdays" not in data
    assert "popular_players" not in data
    teardown_client()
