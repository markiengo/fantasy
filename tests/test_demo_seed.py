from decimal import Decimal

from tools.demo_seed import (
    account_specs,
    budget_max,
    budget_min,
    choose_captain,
    default_password,
    transfer_pairs,
    validate_seed_squad,
)


def player(player_id, position, team_id, price, score=0):
    return {
        "player_id": player_id,
        "name": "Player " + str(player_id),
        "position": position,
        "team_id": team_id,
        "base_price": Decimal(price),
        "md_score": Decimal(score),
    }


def valid_squad(start_id=1):
    return [
        player(start_id + 0, "GK", "AAA", "4.0", 2),
        player(start_id + 1, "DEF", "AAA", "4.0", 3),
        player(start_id + 2, "DEF", "AAA", "4.0", 4),
        player(start_id + 3, "DEF", "BBB", "4.0", 5),
        player(start_id + 4, "DEF", "BBB", "4.0", 6),
        player(start_id + 5, "MID", "BBB", "4.0", 7),
        player(start_id + 6, "MID", "CCC", "4.0", 8),
        player(start_id + 7, "MID", "CCC", "4.0", 9),
        player(start_id + 8, "FWD", "CCC", "5.0", 10),
        player(start_id + 9, "FWD", "DDD", "5.0", 11),
        player(start_id + 10, "FWD", "EEE", "5.0", 12),
    ]


def test_account_specs_are_twenty_login_accounts():
    accounts = account_specs()

    assert len(accounts) == 20
    assert accounts[0]["username"].startswith("demo_")
    assert accounts[0]["password"] == default_password

    usernames = set()
    emails = set()
    for account in accounts:
        usernames.add(account["username"])
        emails.add(account["email"])
        assert len(account["username"]) <= 20
        assert account["email"].endswith("@gaffer.local")

    assert len(usernames) == 20
    assert len(emails) == 20


def test_validate_seed_squad_accepts_budget_target_range():
    squad = valid_squad()
    budget = Decimal("0")
    for row in squad:
        budget += row["base_price"]

    assert budget_min <= budget <= budget_max
    validate_seed_squad(squad)


def test_choose_captain_uses_highest_real_score_then_price():
    squad = valid_squad()
    squad[10]["md_score"] = Decimal("12")
    squad[9]["md_score"] = Decimal("12")
    squad[9]["base_price"] = Decimal("5.5")

    captain = choose_captain(squad)

    assert captain["player_id"] == squad[9]["player_id"]


def test_transfer_pairs_requires_exactly_five_same_position_swaps():
    previous = valid_squad(1)
    current = list(previous[:6])
    current.extend(
        [
            player(101, "MID", "DDD", "4.5"),
            player(102, "MID", "EEE", "4.5"),
            player(103, "FWD", "FFF", "5.0"),
            player(104, "FWD", "GGG", "5.0"),
            player(105, "FWD", "HHH", "5.0"),
        ]
    )

    pairs = transfer_pairs(previous, current)

    assert pairs is not None
    assert len(pairs) == 5
    for outgoing, incoming in pairs:
        assert outgoing["position"] == incoming["position"]


def test_transfer_pairs_rejects_non_five_transfer_candidate():
    previous = valid_squad(1)
    current = list(previous[:7])
    current.extend(
        [
            player(101, "MID", "DDD", "4.5"),
            player(102, "FWD", "EEE", "5.0"),
            player(103, "FWD", "FFF", "5.0"),
            player(104, "FWD", "GGG", "5.0"),
        ]
    )

    assert transfer_pairs(previous, current) is None
