import pytest
import psycopg2

from app import database


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self.closed = False

    def execute(self, query):
        self.conn.queries.append(query)
        if self.conn.execute_error:
            raise self.conn.execute_error

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, closed=0, rollback_error=None, execute_error=None):
        self.closed = closed
        self.rollback_error = rollback_error
        self.execute_error = execute_error
        self.queries = []
        self.rollback_calls = 0
        self.commit_calls = 0

    def cursor(self):
        return FakeCursor(self)

    def rollback(self):
        self.rollback_calls = self.rollback_calls + 1
        if self.rollback_error:
            raise self.rollback_error

    def commit(self):
        self.commit_calls = self.commit_calls + 1


class FakePool:
    def __init__(self, connections):
        self.connections = connections
        self.get_calls = []
        self.put_calls = []

    def getconn(self, key):
        self.get_calls.append(key)
        return self.connections.pop(0)

    def putconn(self, conn, key, close=False):
        self.put_calls.append((conn, key, close))


def test_acquire_healthy_connection_discards_closed_connection():
    closed_conn = FakeConnection(closed=1)
    healthy_conn = FakeConnection()
    db_pool = FakePool([closed_conn, healthy_conn])

    result = database._acquire_healthy_connection(db_pool, 7)

    assert result is healthy_conn
    assert db_pool.put_calls == [(closed_conn, 7, True)]
    assert healthy_conn.queries == ["SELECT 1"]
    assert healthy_conn.rollback_calls == 1


def test_acquire_healthy_connection_discards_failed_health_check():
    stale_conn = FakeConnection(execute_error=psycopg2.OperationalError("server closed the connection"))
    healthy_conn = FakeConnection()
    db_pool = FakePool([stale_conn, healthy_conn])

    result = database._acquire_healthy_connection(db_pool, 8)

    assert result is healthy_conn
    assert db_pool.put_calls == [(stale_conn, 8, True)]
    assert healthy_conn.queries == ["SELECT 1"]

def test_get_db_returns_healthy_connection_to_pool(monkeypatch):
    conn = FakeConnection()
    db_pool = FakePool([conn])
    monkeypatch.setattr(database, "_get_pool", lambda: db_pool)

    dependency = database.get_db()
    assert next(dependency) is conn
    with pytest.raises(StopIteration):
        next(dependency)

    assert conn.commit_calls == 1
    assert db_pool.put_calls[-1] == (conn, db_pool.get_calls[0], False)


def test_get_db_discards_connection_when_rollback_fails(monkeypatch):
    conn = FakeConnection()
    db_pool = FakePool([conn])
    monkeypatch.setattr(database, "_get_pool", lambda: db_pool)

    dependency = database.get_db()
    next(dependency)
    conn.rollback_error = psycopg2.InterfaceError("connection already closed")
    with pytest.raises(RuntimeError):
        dependency.throw(RuntimeError("route failed"))

    assert db_pool.put_calls[-1] == (conn, db_pool.get_calls[0], True)