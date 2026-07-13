from app.queries.analytics import get_dashboard_score_data


class FakeCursor:
    def __init__(self, rows):
        self._rows = rows
        self.calls = 0

    def execute(self, sql, params=None):
        self.calls += 1

    def fetchall(self):
        return self._rows[self.calls - 1]

    def close(self):
        pass


class FakeConn:
    def __init__(self, rows):
        self.cursor_instance = FakeCursor(rows)

    def cursor(self):
        return self.cursor_instance


def test_dashboard_score_data_groups_rounds_and_compositions():
    score_rows = [
        {"matchday": 5, "player_id": 1, "name": "Alpha", "position": "MID", "is_captain": True, "player_score": 12},
        {"matchday": 5, "player_id": 2, "name": "Bravo", "position": "DEF", "is_captain": False, "player_score": 4},
        {"matchday": 6, "player_id": 1, "name": "Alpha", "position": "MID", "is_captain": True, "player_score": 6},
    ]
    composition_rows = [
        {
            "matchday": 5, "goals_pts": 10, "assist_pts": 3, "cs_pts": 4,
            "minute_pts": 4, "card_pts": 0, "saves_pts": 0, "psave_pts": 0,
            "sot_pts": 1, "own_goal_pts": 0, "foul_pts": 0, "offside_pts": 0,
            "gc_pts": 0,
        },
        {
            "matchday": 6, "goals_pts": 5, "assist_pts": 0, "cs_pts": 0,
            "minute_pts": 1, "card_pts": 0, "saves_pts": 0, "psave_pts": 0,
            "sot_pts": 0, "own_goal_pts": 0, "foul_pts": 0, "offside_pts": 0,
            "gc_pts": 0,
        },
    ]
    conn = FakeConn([score_rows, composition_rows])

    result = get_dashboard_score_data(conn, 17)

    assert result["latest_matchday"] == 6
    assert result["by_matchday"] == [
        {"matchday": 5, "squad_score": 16.0},
        {"matchday": 6, "squad_score": 6.0},
    ]
    assert len(result["score_breakdowns"]) == 2
    assert result["score_breakdowns"][0]["breakdown"][0]["player_name"] == "Alpha"
    assert result["compositions"][0]["total"] == 22.0
    assert result["compositions"][1]["total"] == 6.0
    assert conn.cursor_instance.calls == 2