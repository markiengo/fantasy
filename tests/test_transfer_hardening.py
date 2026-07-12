from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_transfer_override_is_backend_scoped_to_previous_matchday():
    source = (ROOT / "app" / "routers" / "transfer.py").read_text(encoding="utf-8")
    assert "get_current_transfer_matchday" in source
    assert "body.matchday == current_transfer_matchday - 1" in source
    assert "Override is limited to the previous matchday" in source


def test_transfer_requests_serialize_before_counting_transfers():
    source = (ROOT / "app" / "routers" / "transfer.py").read_text(encoding="utf-8")
    assert "lock_transfer_slot(conn, user_id, body.matchday)" in source
    assert source.index("lock_transfer_slot(conn") < source.index("transfers_used = count_transfers")


def test_loader_does_not_return_raw_exception_details():
    source = (ROOT / "app" / "routers" / "load_stats.py").read_text(encoding="utf-8")
    assert 'detail="Failed to load stats"' in source
    assert 'detail="Failed to load stats: " + str(exc)' not in source