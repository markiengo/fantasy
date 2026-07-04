from app.queries.squad import create_squad


class FakeCursor:
    def __init__(self, existing_squad_id=None):
        self.existing_squad_id = existing_squad_id
        self.calls = []
        self.next_row = None
        self.closed = False

    def execute(self, sql, params=None):
        normalized = " ".join(sql.split())
        self.calls.append((normalized, params))
        if normalized.startswith("SELECT squad_id"):
            self.next_row = {"squad_id": self.existing_squad_id} if self.existing_squad_id else None
        elif normalized.startswith("INSERT INTO squad "):
            self.next_row = {"squad_id": 77}

    def fetchone(self):
        return self.next_row

    def close(self):
        self.closed = True


class FakeConn:
    def __init__(self, existing_squad_id=None):
        self.cursor_obj = FakeCursor(existing_squad_id)
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


def test_create_squad_inserts_when_matchday_has_no_existing_squad():
    conn = FakeConn()

    squad_id = create_squad(conn, 1, 2, 49.5, [10, 11, 12], captain_player_id=11, time_left=4.25)

    assert squad_id == 77
    assert conn.committed is True
    assert conn.rolled_back is False

    sql_calls = [call[0] for call in conn.cursor_obj.calls]
    assert any(sql.startswith("SELECT squad_id") for sql in sql_calls)
    assert any(sql.startswith("INSERT INTO squad ") for sql in sql_calls)
    assert not any(sql.startswith("UPDATE squad") for sql in sql_calls)
    assert not any(sql.startswith("DELETE FROM squadplayer") for sql in sql_calls)

    player_inserts = [call for call in conn.cursor_obj.calls if call[0].startswith("INSERT INTO squadplayer")]
    assert [call[1] for call in player_inserts] == [(77, 10, False), (77, 11, True), (77, 12, False)]


def test_create_squad_replaces_existing_matchday_squad_players():
    conn = FakeConn(existing_squad_id=42)

    squad_id = create_squad(conn, 1, 2, 48.0, [20, 21, 22], captain_player_id=22, time_left=2.5)

    assert squad_id == 42
    assert conn.committed is True
    assert conn.rolled_back is False

    calls = conn.cursor_obj.calls
    sql_calls = [call[0] for call in calls]
    assert any(sql.startswith("SELECT squad_id") and "FOR UPDATE" in sql for sql in sql_calls)
    assert any(sql.startswith("UPDATE squad") for sql in sql_calls)
    assert any(sql.startswith("DELETE FROM squadplayer") for sql in sql_calls)
    assert not any(sql.startswith("INSERT INTO squad ") for sql in sql_calls)

    update_call = next(call for call in calls if call[0].startswith("UPDATE squad"))
    delete_call = next(call for call in calls if call[0].startswith("DELETE FROM squadplayer"))
    assert update_call[1] == (48.0, 2.5, 42)
    assert delete_call[1] == (42,)

    player_inserts = [call for call in calls if call[0].startswith("INSERT INTO squadplayer")]
    assert [call[1] for call in player_inserts] == [(42, 20, False), (42, 21, False), (42, 22, True)]