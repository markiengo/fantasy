from app.services import stat_loader


def completed_event():
    return {
        "event_id": "espn-match-1",
        "home": "ARG",
        "away": "FRA",
        "home_score": 2,
        "away_score": 0,
        "completed": True,
    }


def appeared_player(espn_id="espn-player-1", team="ARG"):
    return {
        "espn_id": espn_id,
        "team": team,
        "appeared": True,
        "goals": 1,
        "assists": 0,
        "minutes": 90,
        "yellow": 0,
        "red": 0,
    }


def test_date_range_inclusive():
    assert stat_loader.date_range(from_date="20260611", to_date="20260613") == [
        "20260611",
        "20260612",
        "20260613",
    ]


def test_date_range_requires_complete_range():
    import pytest

    with pytest.raises(ValueError):
        stat_loader.date_range(from_date="20260611")

    with pytest.raises(ValueError):
        stat_loader.date_range(to_date="20260613")


def test_date_range_rejects_reverse_range():
    import pytest

    with pytest.raises(ValueError):
        stat_loader.date_range(from_date="20260613", to_date="20260611")


def test_load_stats_dry_run_counts_mapped_and_unmapped_rows(monkeypatch):
    def fake_load_map(name):
        if name == "idmap.json":
            return {"espn-player-1": 10}
        return {"espn-match-1": 20}

    def fake_scoreboard(ymd):
        return [completed_event()]

    def fake_match_player_stats(event_id):
        return [
            appeared_player(),
            appeared_player("unmapped-player", "FRA"),
            {
                "espn_id": "bench-player",
                "team": "ARG",
                "appeared": False,
                "goals": 0,
                "assists": 0,
                "minutes": 0,
                "yellow": 0,
                "red": 0,
            },
        ]

    monkeypatch.setattr(stat_loader, "load_map", fake_load_map)
    monkeypatch.setattr(stat_loader.espn, "scoreboard", fake_scoreboard)
    monkeypatch.setattr(stat_loader.espn, "match_player_stats", fake_match_player_stats)

    totals = stat_loader.load_stats(None, date_value="20260611", dry_run=True)

    assert totals["dates"] == ["20260611"]
    assert totals["matches_seen"] == 1
    assert totals["matches_completed"] == 1
    assert totals["matches_updated"] == 1
    assert totals["inserted"] == 1
    assert totals["skipped_unmapped_player"] == 1
    assert totals["errors"] == 0


def test_load_stats_inserts_valid_mapped_player(monkeypatch):
    batch_calls = []

    def fake_load_map(name):
        if name == "idmap.json":
            return {"espn-player-1": 10}
        return {"espn-match-1": 20}

    def fake_scoreboard(ymd):
        return [completed_event()]

    def fake_match_player_stats(event_id):
        return [appeared_player()]

    def fake_update_event_score(conn, match_id, event):
        assert match_id == 20
        return True

    def fake_post_playerstats_batch(conn, match_id, stats_list):
        batch_calls.append((match_id, stats_list))
        return len(stats_list), 0

    monkeypatch.setattr(stat_loader, "load_map", fake_load_map)
    monkeypatch.setattr(stat_loader.espn, "scoreboard", fake_scoreboard)
    monkeypatch.setattr(stat_loader.espn, "match_player_stats", fake_match_player_stats)
    monkeypatch.setattr(stat_loader, "update_event_score", fake_update_event_score)
    monkeypatch.setattr(stat_loader, "post_playerstats_batch", fake_post_playerstats_batch)

    totals = stat_loader.load_stats(object(), date_value="20260611")

    assert totals["matches_updated"] == 1
    assert totals["inserted"] == 1
    assert totals["errors"] == 0
    assert len(batch_calls) == 1
    match_id, stats_list = batch_calls[0]
    assert match_id == 20
    assert stats_list == [{
        "player_id": 10,
        "match_id": 20,
        "goals": 1,
        "assists": 0,
        "minutes_played": 90,
        "yellow_cards": 0,
        "red_cards": 0,
        "clean_sheet": 1,
    }]
