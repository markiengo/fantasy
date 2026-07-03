import argparse
import sys
from pathlib import Path

import httpx

repo_root = Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from tools.demo_seed import account_specs, default_password, require_env


def sign_in(client, supabase_url, anon_key, email, password):
    response = client.post(
        supabase_url.rstrip("/") + "/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    response.raise_for_status()
    payload = response.json()
    return payload["access_token"]


def api_get(client, api_base, token, path):
    response = client.get(
        api_base.rstrip("/") + path,
        headers={"Authorization": "Bearer " + token},
    )
    response.raise_for_status()
    return response.json()


def verify_account(client, api_base, token, account):
    result = {"username": account["username"], "checks": 0}

    me = api_get(client, api_base, token, "/me")
    if me["username"] != account["username"]:
        raise AssertionError("Expected /me username " + account["username"] + ", got " + me["username"])
    result["checks"] += 1

    for matchday in range(1, 6):
        squad = api_get(client, api_base, token, "/squad?matchday=" + str(matchday))
        if len(squad.get("players", [])) != 11:
            raise AssertionError(account["username"] + " matchday " + str(matchday) + " does not have 11 players")
        captains = 0
        for player in squad["players"]:
            if player.get("is_captain"):
                captains += 1
        if captains != 1:
            raise AssertionError(account["username"] + " matchday " + str(matchday) + " does not have one captain")
        result["checks"] += 1

    for matchday in range(2, 6):
        transfers = api_get(client, api_base, token, "/transfers?matchday=" + str(matchday))
        if len(transfers) != 5:
            raise AssertionError(
                account["username"]
                + " matchday "
                + str(matchday)
                + " expected 5 transfers, got "
                + str(len(transfers))
            )
        result["checks"] += 1

    cumulative = api_get(client, api_base, token, "/analytics/squad-score")
    if len(cumulative.get("by_matchday", [])) < 4:
        raise AssertionError(account["username"] + " cumulative analytics missing matchdays")
    result["checks"] += 1

    for matchday in range(1, 5):
        score = api_get(client, api_base, token, "/analytics/squad-score?matchday=" + str(matchday))
        if len(score.get("breakdown", [])) == 0:
            raise AssertionError(account["username"] + " empty score breakdown for matchday " + str(matchday))
        composition = api_get(client, api_base, token, "/analytics/composition?matchday=" + str(matchday))
        if composition.get("total") is None:
            raise AssertionError(account["username"] + " missing composition for matchday " + str(matchday))
        result["checks"] += 2

    rank_history = api_get(client, api_base, token, "/analytics/rank-history")
    if len(rank_history.get("rank_history", [])) < 4:
        raise AssertionError(account["username"] + " rank history missing matchdays")
    result["checks"] += 1

    leaderboard = api_get(client, api_base, token, "/leaderboard")
    if len(leaderboard.get("entries", [])) < 21:
        raise AssertionError("Leaderboard expected 21+ entries, got " + str(len(leaderboard.get("entries", []))))
    result["checks"] += 1

    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description="Sign into each seeded demo account and verify API surfaces.")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000/api")
    parser.add_argument("--password", default=default_password)
    args = parser.parse_args(argv)

    env = require_env(("SUPABASE_URL", "SUPABASE_ANON_KEY"))
    accounts = account_specs(args.password)

    passed = 0
    with httpx.Client(timeout=60, trust_env=False) as client:
        for account in accounts:
            token = sign_in(client, env["SUPABASE_URL"], env["SUPABASE_ANON_KEY"], account["email"], account["password"])
            result = verify_account(client, args.api_base, token, account)
            passed += 1
            print(str(passed).rjust(2) + "/20", account["username"], "passed", result["checks"], "checks", flush=True)

    print("All 20 demo accounts passed verification.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
