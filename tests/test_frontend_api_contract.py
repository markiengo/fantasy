from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _api_return_block():
    api_js = (ROOT / "frontend" / "js" / "api.js").read_text(encoding="utf-8")
    start = api_js.index("  return {")
    end = api_js.index("  };", start)
    return api_js[start:end]


def test_authenticated_api_calls_do_not_use_mock_fallback():
    block = _api_return_block()
    protected_calls = [
        "getSquad",
        "createSquad",
        "getTransfers",
        "createTransfer",
        "getSquadScore",
        "getComposition",
        "getRankHistory",
        "getPlayerBreakdown",
        "getLeagueComparison",
        "updateData",
        "getMe",
        "updateDisplayName",
        "getAccount",
        "completeProfile",
        "getLeaderboard",
    ]

    all_calls = protected_calls + [
        "getPlayers",
        "getTeams",
        "getMatches",
        "getMatch",
        "getPlayerStats",
        "getTopStats",
    ]

    for name in protected_calls:
        marker = f"    {name}:"
        start = block.index(marker)
        next_start = len(block)
        for other_name in all_calls:
            other_marker = f"    {other_name}:"
            if other_marker == marker:
                continue
            pos = block.find(other_marker, start + 1)
            if pos != -1 and pos < next_start:
                next_start = pos
        snippet = block[start:next_start]
        assert "withFallback" not in snippet
        assert "Mock." not in snippet


def test_public_catalog_reads_are_the_only_mock_fallback_surface():
    block = _api_return_block()
    allowed_fallbacks = [
        "getPlayers",
        "getTeams",
        "getMatches",
        "getMatch",
        "getPlayerStats",
        "getTopStats",
    ]

    for name in allowed_fallbacks:
        marker = f"    {name}:"
        start = block.index(marker)
        next_start = block.find("    get", start + 1)
        if next_start == -1:
            next_start = len(block)
        snippet = block[start:next_start]
        assert "withFallback" in snippet
