import pytest
from decimal import Decimal
from datetime import date
from app.core.validation import (
    validate_squad_size, validate_formation,
    validate_nation_limit, validate_budget,
    validate_transfer_window, simulate_transfer, validate_squad,
    SquadValidationError, budget_cap,
)


# Helper: builds a list of fake player dicts
# positions = list of position strings e.g. ["GK", "DEF", ...]
# team_ids  = which nation each player is from (defaults to spread across 5 nations)
# prices    = base_price for each player (defaults to 8.0 each)
def make_players(positions, team_ids=None, prices=None):
    if team_ids is None:
        team_ids = [i % 5 for i in range(len(positions))]
    if prices is None:
        prices = [Decimal("8")] * len(positions)

    players = []
    for i, (pos, tid, price) in enumerate(zip(positions, team_ids, prices)):
        players.append({
            "player_id": i,
            "position": pos,
            "team_id": tid,
            "base_price": price
        })
    return players


# Two valid formations to reuse across tests
VALID_433 = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"]
VALID_442 = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"]


# validate_squad_size

def test_squad_size_exact():
    # Exact 11 players passes
    validate_squad_size(make_players(VALID_433))

def test_squad_size_too_few():
    # 7 players fails
    with pytest.raises(SquadValidationError):
        validate_squad_size(make_players(["GK"] * 7))

def test_squad_size_too_many():
    # 12 players fails
    with pytest.raises(SquadValidationError):
        validate_squad_size(make_players(["GK"] * 12))

def test_duplicate_ids():
    # Duplicate IDs fail
    players = [
        {"player_id": 1, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 1, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 2, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 3, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 4, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 5, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 6, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 7, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 8, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 9, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
        {"player_id": 10, "position": "GK", "team_id": 1, "base_price": Decimal("8")},
    ]
    with pytest.raises(SquadValidationError):
        validate_squad_size(players)


# validate_formation

def test_433_valid():
    # 4-3-3 formation valid
    validate_formation(make_players(VALID_433))

def test_442_valid():
    # 4-4-2 formation valid
    validate_formation(make_players(VALID_442))

def test_bad_formation_raises():
    # Invalid formation fails
    bad = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "FWD", "FWD", "FWD", "FWD"]
    with pytest.raises(SquadValidationError):
        validate_formation(make_players(bad))


# validate_nation_limit

def test_nation_limit_ok():
    # 3 per nation OK
    validate_nation_limit(make_players(["GK"] * 3, team_ids=[1, 1, 1]))

def test_nation_limit_exceeded():
    # 4 per nation fails
    with pytest.raises(SquadValidationError):
        validate_nation_limit(make_players(["GK"] * 4, team_ids=[1, 1, 1, 1]))


# validate_budget

def test_budget_exactly_cap():
    # Budget exactly at the cap passes
    validate_budget([{"base_price": budget_cap}])

def test_budget_over_cap():
    # A cent over the cap fails
    with pytest.raises(SquadValidationError):
        validate_budget([{"base_price": budget_cap + Decimal("0.01")}])

def test_budget_spread():
    # An evenly-spread 11-player squad well under the cap passes (total = budget_cap / 2)
    each = budget_cap / Decimal("22")
    players = make_players(VALID_433, prices=[each] * 11)
    validate_budget(players)


# validate_transfer_window

def test_window_open():
    # Window open passes
    validate_transfer_window(date(2026, 6, 1), date(2026, 6, 10))

def test_window_closed_same_day():
    # Window closed same day fails
    with pytest.raises(SquadValidationError):
        validate_transfer_window(date(2026, 6, 10), date(2026, 6, 10))

def test_window_closed_after():
    # Window closed after fails
    with pytest.raises(SquadValidationError):
        validate_transfer_window(date(2026, 6, 15), date(2026, 6, 10))


# simulate_transfer

def test_simulate_transfer_ok():
    squad = make_players(VALID_433)
    player_in = {"player_id": 99, "position": "GK", "team_id": 9, "base_price": Decimal("8")}

    # Valid transfer passes
    result = simulate_transfer(squad, squad[0]["player_id"], player_in)

    assert len(result) == 11          # still 11 players
    assert player_in in result        # new player is in
    assert squad[0] not in result     # old player is out

def test_simulate_transfer_player_not_in_squad():
    squad = make_players(VALID_433)
    player_in = {"player_id": 99, "position": "GK", "team_id": 9, "base_price": Decimal("8")}

    # Player not in squad fails
    with pytest.raises(SquadValidationError):
        simulate_transfer(squad, 999, player_in)


# Creative: Realistic World Cup-style squad tests

def test_realistic_world_cup_squad_433():
    # Realistic, valid squad passes: 4-3-3, ≤3 per nation, total under the cap.
    # Relative prices preserved but scaled to budget_cap (original total was 64),
    # so this stays valid at any cap. f = budget_cap / 80 → total = 0.8 * budget_cap.
    f = budget_cap / Decimal("80")
    players = [
        {"player_id": 1, "position": "GK", "team_id": "BRA", "base_price": Decimal("5.5") * f},
        {"player_id": 2, "position": "DEF", "team_id": "BRA", "base_price": Decimal("5.0") * f},
        {"player_id": 3, "position": "DEF", "team_id": "ARG", "base_price": Decimal("5.5") * f},
        {"player_id": 4, "position": "DEF", "team_id": "FRA", "base_price": Decimal("6.0") * f},
        {"player_id": 5, "position": "DEF", "team_id": "GER", "base_price": Decimal("5.0") * f},
        {"player_id": 6, "position": "MID", "team_id": "BRA", "base_price": Decimal("6.5") * f},
        {"player_id": 7, "position": "MID", "team_id": "ARG", "base_price": Decimal("6.0") * f},
        {"player_id": 8, "position": "MID", "team_id": "ENG", "base_price": Decimal("5.5") * f},
        {"player_id": 9, "position": "FWD", "team_id": "FRA", "base_price": Decimal("7.0") * f},
        {"player_id": 10, "position": "FWD", "team_id": "ARG", "base_price": Decimal("6.5") * f},
        {"player_id": 11, "position": "FWD", "team_id": "GER", "base_price": Decimal("5.5") * f},
    ]
    validate_squad(players)  # total = 0.8 * budget_cap; (BRA:3, ARG:3, FRA:2, GER:2, ENG:1)

def test_budget_full_squad_exactly_at_cap():
    # A full 11-player squad summing to EXACTLY the cap passes.
    # 10 players share half the cap; the 11th carries the remaining half → total = budget_cap.
    head = budget_cap / Decimal("20")          # 10 of these = budget_cap / 2
    last = budget_cap - head * 10              # = budget_cap / 2 → total = budget_cap
    players = make_players(VALID_433, prices=[head] * 10 + [last])
    validate_budget(players)

def test_budget_one_cent_over():
    # The same squad, one cent over the cap, fails (total = budget_cap + 0.01)
    head = budget_cap / Decimal("20")
    last = budget_cap - head * 10 + Decimal("0.01")
    players = make_players(VALID_433, prices=[head] * 10 + [last])
    with pytest.raises(SquadValidationError):
        validate_budget(players)

def test_formation_missing_goalkeeper():
    # Missing GK fails
    bad_formation = ["DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD", "FWD"]
    with pytest.raises(SquadValidationError):
        validate_formation(make_players(bad_formation))

def test_formation_too_many_defenders():
    # 5 defenders fails
    bad_formation = ["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD"]
    with pytest.raises(SquadValidationError):
        validate_formation(make_players(bad_formation))

def test_nation_limit_exactly_three():
    # Exactly 3 per nation OK
    players = make_players(
        ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
        team_ids=[1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9]  # 3 from nation 1
    )
    validate_nation_limit(players)  # Should pass

def test_transfer_window_closes_at_midnight():
    # Window closes at midnight
    # Window open: June 10, 2026 at 00:00:01
    validate_transfer_window(date(2026, 6, 10), date(2026, 6, 11))
    # Window closed: June 11, 2026 at 00:00:00 (first match day)
    with pytest.raises(SquadValidationError):
        validate_transfer_window(date(2026, 6, 11), date(2026, 6, 11))

def test_expensive_star_player_squad():
    # One pricey star + 10 cheaper players, total under the cap, passes.
    star = budget_cap / Decimal("5")            # one premium player (0.2 * cap)
    rest = (budget_cap / Decimal("2")) / Decimal("10")   # 10 players sharing cap / 2
    players = make_players(VALID_433, prices=[star] + [rest] * 10)
    # total = 0.2 * cap + 0.5 * cap = 0.7 * budget_cap → passes
    validate_budget(players)

def test_all_cheap_players():
    # An all-cheap squad well under the cap passes (total ≈ 0.85 * budget_cap)
    cheap = budget_cap / Decimal("13")
    players = make_players(VALID_433, prices=[cheap] * 11)
    validate_budget(players)

def test_transfer_maintains_formation():
    # Transfer maintains formation
    squad = make_players(VALID_433)
    # Swap a DEF for another DEF
    player_in = {"player_id": 99, "position": "DEF", "team_id": 9, "base_price": Decimal("8")}
    result = simulate_transfer(squad, squad[1]["player_id"], player_in)
    validate_formation(result)  # Should still be valid