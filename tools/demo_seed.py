import argparse
import json
import os
import random
import sys
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path

import httpx
import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

repo_root = Path(__file__).resolve().parents[1]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from app.core.validation import SquadValidationError, validate_squad


default_password = "GafferDemo2026!"
seed_value = 20260702
seed_matchdays = [1, 2, 3, 4]
current_squad_matchday = 5
budget_min = Decimal("47.0")
budget_max = Decimal("50.0")

formations = (
    ("GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"),
    ("GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"),
)


seed_names = (
    "moonpacket",
    "ronaldocr7",
    "thumbystuffer",
    "pixelbusquets",
    "noodlepress",
    "cornerpacket",
    "sleepyvar",
    "tacotre",
    "megamindinho",
    "chaosfullback",
    "wizardpress",
    "offsidewaffle",
    "leftbootlarry",
    "halftimebagel",
    "xgmerchant",
    "nutmegfolder",
    "pressresistant",
    "keeperbeans",
    "touchlinewifi",
    "captainpancake",
)


def account_specs(password=default_password):
    accounts = []
    for index, name in enumerate(seed_names, start=1):
        username = "demo_" + name
        display_name = "Demo " + name.replace("_", " ").title()
        accounts.append(
            {
                "index": index,
                "username": username,
                "display_name": display_name,
                "email": username + "@gaffer.local",
                "password": password,
            }
        )
    return accounts


def load_env():
    load_dotenv(dotenv_path=repo_root / ".env")
    env = {}
    for key in ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        value = os.getenv(key)
        if value:
            env[key] = value.strip()
    return env


def require_env(keys):
    env = load_env()
    missing = []
    for key in keys:
        if not env.get(key):
            missing.append(key)
    if missing:
        raise RuntimeError("Missing required env vars: " + ", ".join(missing))
    return env


def connect_db():
    env = require_env(("DATABASE_URL",))
    return psycopg2.connect(env["DATABASE_URL"], cursor_factory=RealDictCursor)


class SupabaseAdmin:
    def __init__(self, supabase_url, service_role_key):
        self.supabase_url = supabase_url.rstrip("/")
        self.headers = {
            "apikey": service_role_key,
            "Authorization": "Bearer " + service_role_key,
            "Content-Type": "application/json",
        }

    def _url(self, path):
        return self.supabase_url + path

    def list_users(self):
        response = httpx.get(
            self._url("/auth/v1/admin/users"),
            headers=self.headers,
            params={"page": 1, "per_page": 1000},
            timeout=20,
            trust_env=False,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("users", payload if isinstance(payload, list) else [])

    def find_user_by_email(self, email):
        email_lc = email.lower()
        for user in self.list_users():
            if (user.get("email") or "").lower() == email_lc:
                return user
        return None

    def create_or_update_user(self, spec, existing=None):
        if existing is None:
            existing = self.find_user_by_email(spec["email"])
        payload = {
            "email": spec["email"],
            "password": spec["password"],
            "email_confirm": True,
            "user_metadata": {"username": spec["username"]},
        }
        if existing:
            return existing, False

        response = httpx.post(
            self._url("/auth/v1/admin/users"),
            headers=self.headers,
            json=payload,
            timeout=20,
        trust_env=False,
        )
        response.raise_for_status()
        return response.json(), True


def assert_live_shape(conn):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'squadplayer'
              AND column_name = 'is_captain'
            """
        )
        if not cursor.fetchone():
            raise RuntimeError("Live DB is missing squadplayer.is_captain")

        cursor.execute(
            """
            SELECT matchday, COUNT(*) AS matches
            FROM match
            WHERE matchday = ANY(%s)
            GROUP BY matchday
            ORDER BY matchday
            """,
            (seed_matchdays + [current_squad_matchday],),
        )
        found = set()
        for row in cursor.fetchall():
            found.add(row["matchday"])
        for matchday in seed_matchdays + [current_squad_matchday]:
            if matchday not in found:
                raise RuntimeError("Missing matchday " + str(matchday) + " in match table")
    finally:
        cursor.close()


def fetch_scored_players(conn):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                m.matchday,
                p.player_id,
                p.name,
                p.position,
                p.team_id,
                p.base_price,
                SUM(ps.score) AS md_score
            FROM player p
            JOIN playerstat ps ON ps.player_id = p.player_id
            JOIN match m ON m.match_id = ps.match_id
            WHERE p.in_tournament = true
              AND m.matchday = ANY(%s)
            GROUP BY m.matchday, p.player_id, p.name, p.position, p.team_id, p.base_price
            """,
            (seed_matchdays,),
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()

    by_matchday = defaultdict(lambda: defaultdict(list))
    for row in rows:
        normalized = dict(row)
        normalized["base_price"] = Decimal(normalized["base_price"])
        normalized["md_score"] = Decimal(normalized["md_score"] or 0)
        by_matchday[normalized["matchday"]][normalized["position"]].append(normalized)

    for matchday in seed_matchdays:
        for position in ("GK", "DEF", "MID", "FWD"):
            pool = by_matchday[matchday][position]
            if not pool:
                raise RuntimeError("No scored " + position + " players for matchday " + str(matchday))
            pool.sort(key=lambda item: (-item["md_score"], -item["base_price"], item["player_id"]))
    return by_matchday


def fetch_current_players(conn):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT player_id, name, position, team_id, base_price, 0::numeric AS md_score
            FROM player
            WHERE in_tournament = true
            ORDER BY base_price DESC, player_id ASC
            """
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()

    by_position = defaultdict(list)
    for row in rows:
        normalized = dict(row)
        normalized["base_price"] = Decimal(normalized["base_price"])
        normalized["md_score"] = Decimal("0")
        by_position[normalized["position"]].append(normalized)
    return by_position


def squad_budget(players):
    total = Decimal("0")
    for player in players:
        total += player["base_price"]
    return total


def squad_score(players):
    captain = choose_captain(players)
    total = Decimal("0")
    for player in players:
        multiplier = Decimal("2") if player["player_id"] == captain["player_id"] else Decimal("1")
        total += player.get("md_score", Decimal("0")) * multiplier
    return total


def choose_captain(players):
    return max(players, key=lambda item: (item.get("md_score", Decimal("0")), item["base_price"], -item["player_id"]))


def validate_seed_squad(players):
    validate_squad(players)
    budget = squad_budget(players)
    if budget < budget_min or budget > budget_max:
        raise SquadValidationError("Budget " + str(budget) + " outside demo range")


def generate_candidates_for_matchday(by_matchday, matchday, rng, goal=520):
    candidates = []
    seen = set()
    attempts = 0

    while len(candidates) < goal and attempts < goal * 140:
        attempts = attempts + 1
        formation = formations[attempts % len(formations)]
        players = []
        used_ids = set()

        for position in formation:
            pool = by_matchday[matchday][position]
            mode = attempts % 4
            if mode == 0:
                source = pool[:140]
            elif mode == 1:
                source = sorted(pool, key=lambda item: (-item["base_price"], -item["md_score"]))[:180]
            elif mode == 2:
                source = pool[20:260] if len(pool) > 260 else pool
            else:
                source = pool[:260]

            sample_size = min(34, len(source))
            picked = None
            for candidate in rng.sample(source, sample_size):
                if candidate["player_id"] not in used_ids:
                    picked = candidate
                    break
            if not picked:
                break
            players.append(picked)
            used_ids.add(picked["player_id"])

        if len(players) != 11:
            continue

        key = tuple(sorted(player["player_id"] for player in players))
        if key in seen:
            continue
        seen.add(key)

        try:
            validate_seed_squad(players)
        except SquadValidationError:
            continue

        candidate_score = squad_score(players)
        candidate_captain = choose_captain(players)
        candidates.append(
            {
                "players": players,
                "ids": set(key),
                "budget": squad_budget(players),
                "score": candidate_score,
                "captain": candidate_captain,
            }
        )

    if len(candidates) < 100:
        raise RuntimeError(
            "Only generated " + str(len(candidates)) + " candidates for matchday " + str(matchday)
        )
    return candidates


def generate_current_candidates(by_position, rng, goal=520):
    candidates = []
    seen = set()
    attempts = 0

    while len(candidates) < goal and attempts < goal * 160:
        attempts = attempts + 1
        formation = formations[attempts % len(formations)]
        players = []
        used_ids = set()

        for position in formation:
            pool = by_position[position]
            source = pool[:240]
            sample_size = min(36, len(source))
            picked = None
            for candidate in rng.sample(source, sample_size):
                if candidate["player_id"] not in used_ids:
                    picked = candidate
                    break
            if not picked:
                break
            players.append(picked)
            used_ids.add(picked["player_id"])

        if len(players) != 11:
            continue

        key = tuple(sorted(player["player_id"] for player in players))
        if key in seen:
            continue
        seen.add(key)

        try:
            validate_seed_squad(players)
        except SquadValidationError:
            continue

        candidates.append(
            {
                "players": players,
                "ids": set(key),
                "budget": squad_budget(players),
                "score": Decimal("0"),
                "captain": choose_captain(players),
            }
        )

    if len(candidates) < 100:
        raise RuntimeError("Only generated " + str(len(candidates)) + " current-round candidates")
    return candidates


def candidate_from_players(players):
    validate_seed_squad(players)
    return {
        "players": players,
        "ids": set(player["player_id"] for player in players),
        "budget": squad_budget(players),
        "score": squad_score(players),
        "captain": choose_captain(players),
    }


def generate_transition_candidates(previous_pick, by_position, rng, goal=180):
    candidates = []
    seen = set()
    previous_players = previous_pick["players"]
    previous_ids = set(player["player_id"] for player in previous_players)
    current_by_id = {}
    for rows in by_position.values():
        for row in rows:
            current_by_id[row["player_id"]] = row
    attempts = 0

    while len(candidates) < goal and attempts < goal * 120:
        attempts = attempts + 1
        outgoing = rng.sample(previous_players, 5)
        outgoing_ids = set(player["player_id"] for player in outgoing)
        retained = []
        for player in previous_players:
            if player["player_id"] not in outgoing_ids:
                retained.append(current_by_id.get(player["player_id"], dict(player, md_score=Decimal("0"))))

        incoming = []
        incoming_ids = set()
        failed = False
        for out_player in outgoing:
            pool = by_position[out_player["position"]]
            source = pool[:280]
            sample_size = min(44, len(source))
            picked = None
            for candidate in rng.sample(source, sample_size):
                if candidate["player_id"] in previous_ids:
                    continue
                if candidate["player_id"] in incoming_ids:
                    continue
                picked = candidate
                break
            if not picked:
                failed = True
                break
            incoming.append(picked)
            incoming_ids.add(picked["player_id"])

        if failed:
            continue

        players = retained + incoming
        key = tuple(sorted(player["player_id"] for player in players))
        if key in seen:
            continue
        seen.add(key)

        try:
            candidates.append(candidate_from_players(players))
        except SquadValidationError:
            continue

    if len(candidates) < 50:
        raise RuntimeError("Only generated " + str(len(candidates)) + " transition candidates")
    return candidates


def position_counts(players):
    counts = Counter()
    for player in players:
        counts[player["position"]] += 1
    return counts


def transfer_pairs(previous, current):
    prev_by_id = {}
    curr_by_id = {}
    for player in previous:
        prev_by_id[player["player_id"]] = player
    for player in current:
        curr_by_id[player["player_id"]] = player

    outgoing = []
    incoming = []
    for player_id, player in prev_by_id.items():
        if player_id not in curr_by_id:
            outgoing.append(player)
    for player_id, player in curr_by_id.items():
        if player_id not in prev_by_id:
            incoming.append(player)

    if len(outgoing) != 5 or len(incoming) != 5:
        return None
    if position_counts(outgoing) != position_counts(incoming):
        return None

    pairs = []
    used_in = set()
    for out_player in outgoing:
        matched = None
        for in_player in incoming:
            if in_player["player_id"] in used_in:
                continue
            if in_player["position"] == out_player["position"]:
                matched = in_player
                break
        if not matched:
            return None
        used_in.add(matched["player_id"])
        pairs.append((out_player, matched))
    return pairs


def max_same_squad_overlap(existing_picks, candidate):
    max_overlap = 0
    for pick in existing_picks:
        overlap = len(pick["ids"] & candidate["ids"])
        if overlap > max_overlap:
            max_overlap = overlap
    return max_overlap


def select_seed_plan(scored_players, current_players, admin_score=Decimal("200")):
    rng = random.Random(seed_value)
    candidate_map = {}
    for matchday in seed_matchdays:
        candidate_map[matchday] = generate_candidates_for_matchday(scored_players, matchday, rng)
    target_totals = [
        admin_score + Decimal("30"),
        admin_score + Decimal("18"),
        admin_score + Decimal("7"),
        admin_score - Decimal("5"),
        admin_score - Decimal("10"),
        admin_score - Decimal("14"),
        admin_score - Decimal("18"),
        admin_score - Decimal("22"),
        admin_score - Decimal("26"),
        admin_score - Decimal("30"),
        admin_score - Decimal("34"),
        admin_score - Decimal("38"),
        admin_score - Decimal("42"),
        admin_score - Decimal("46"),
        admin_score - Decimal("50"),
        admin_score - Decimal("54"),
        admin_score - Decimal("58"),
        admin_score - Decimal("62"),
        admin_score - Decimal("66"),
        admin_score - Decimal("70"),
    ]

    usage = Counter()
    manager_picks = defaultdict(list)

    for manager_index, target_total in enumerate(target_totals):
        running_total = Decimal("0")
        for offset, matchday in enumerate(seed_matchdays):
            remaining = Decimal(str(len(seed_matchdays) - offset))
            target = (target_total - running_total) / remaining
            best = None
            best_key = None
            previous_pick = manager_picks[manager_index][-1] if manager_picks[manager_index] else None
            if previous_pick:
                by_position = defaultdict(list)
                dedupe = defaultdict(dict)
                for source_candidate in candidate_map[matchday]:
                    for player in source_candidate["players"]:
                        dedupe[player["position"]][player["player_id"]] = player
                for position in dedupe:
                    rows = list(dedupe[position].values())
                    rows.sort(key=lambda item: (-item.get("md_score", Decimal("0")), -item["base_price"], item["player_id"]))
                    by_position[position] = rows
                candidate_source = generate_transition_candidates(previous_pick, by_position, rng)
            else:
                candidate_source = candidate_map[matchday]

            for candidate in candidate_source:
                overlap_global = 0
                for player_id in candidate["ids"]:
                    overlap_global += usage[player_id]
                overlap_same_manager = max_same_squad_overlap(manager_picks[manager_index], candidate)
                if overlap_same_manager > 6:
                    continue
                score_gap = abs(candidate["score"] - target)
                budget_gap = abs(candidate["budget"] - Decimal("48.5"))
                key = (score_gap, overlap_global, overlap_same_manager, budget_gap)
                if best is None or key < best_key:
                    best = candidate
                    best_key = key

            if not best:
                raise RuntimeError(
                    "Could not select matchday "
                    + str(matchday)
                    + " squad for demo manager "
                    + str(manager_index + 1)
                )

            manager_picks[manager_index].append(best)
            for player_id in best["ids"]:
                usage[player_id] += 1
            running_total += best["score"]

        previous_pick = manager_picks[manager_index][-1]
        best_current = None
        best_current_key = None
        current_source = generate_transition_candidates(previous_pick, current_players, rng)
        for candidate in current_source:
            overlap_global = 0
            for player_id in candidate["ids"]:
                overlap_global += usage[player_id]
            overlap_same_manager = max_same_squad_overlap(manager_picks[manager_index], candidate)
            if overlap_same_manager > 6:
                continue
            budget_gap = abs(candidate["budget"] - Decimal("48.5"))
            key = (overlap_global, overlap_same_manager, budget_gap)
            if best_current is None or key < best_current_key:
                best_current = candidate
                best_current_key = key
        if not best_current:
            raise RuntimeError("Could not select matchday 5 squad for demo manager " + str(manager_index + 1))
        manager_picks[manager_index].append(best_current)
        for player_id in best_current["ids"]:
            usage[player_id] += 1

    accounts = account_specs()
    plan = []
    for manager_index, spec in enumerate(accounts):
        picks = manager_picks[manager_index]
        total_score = Decimal("0")
        for pick in picks[:4]:
            total_score += pick["score"]
        plan.append(
            {
                "account": spec,
                "picks": picks,
                "total_score": total_score,
            }
        )
    return plan


def summarize_plan(plan, admin_score=Decimal("200")):
    budgets = []
    scores = []
    player_usage = Counter()
    for manager in plan:
        for pick in manager["picks"]:
            budgets.append(pick["budget"])
            if pick["score"] > 0:
                scores.append(pick["score"])
            for player in pick["players"]:
                player_usage[player["player_id"]] += 1

    totals = []
    for manager in plan:
        totals.append(manager["total_score"])
    totals.sort(reverse=True)

    return {
        "manager_count": len(plan),
        "squad_count": len(plan) * 5,
        "above_admin": sum(1 for total in totals if total > admin_score),
        "score_min": min(scores),
        "score_avg": sum(scores) / Decimal(str(len(scores))),
        "score_max": max(scores),
        "total_min": min(totals),
        "total_avg": sum(totals) / Decimal(str(len(totals))),
        "total_max": max(totals),
        "budget_min": min(budgets),
        "budget_avg": sum(budgets) / Decimal(str(len(budgets))),
        "budget_max": max(budgets),
        "unique_players": len(player_usage),
        "max_player_usage": max(player_usage.values()),
    }


def get_admin_score(conn):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT COALESCE(SUM(
                CASE WHEN sp.is_captain = true THEN ps.score * 2 ELSE ps.score END
            ), 0) AS score
            FROM users u
            JOIN squad s ON s.user_id = u.user_id
            JOIN squadplayer sp ON sp.squad_id = s.squad_id
            JOIN playerstat ps ON ps.player_id = sp.player_id
            JOIN match m ON m.match_id = ps.match_id AND m.matchday = s.matchday
            WHERE u.role = 'admin'
              AND s.matchday = ANY(%s)
            """,
            (seed_matchdays,),
        )
        row = cursor.fetchone()
        return Decimal(row["score"] or 0)
    finally:
        cursor.close()


def reset_public_seed_rows(conn, accounts):
    usernames = []
    for account in accounts:
        usernames.append(account["username"])

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM users WHERE username = ANY(%s)", (usernames,))
        user_ids = []
        for row in cursor.fetchall():
            user_ids.append(row["user_id"])
        if not user_ids:
            return {"users": 0, "squads": 0, "squadplayers": 0, "transfers": 0}

        cursor.execute("DELETE FROM transfers WHERE user_id = ANY(%s)", (user_ids,))
        transfers_deleted = cursor.rowcount

        cursor.execute(
            """
            DELETE FROM squadplayer sp
            USING squad s
            WHERE sp.squad_id = s.squad_id
              AND s.user_id = ANY(%s)
            """,
            (user_ids,),
        )
        squadplayers_deleted = cursor.rowcount

        cursor.execute("DELETE FROM squad WHERE user_id = ANY(%s)", (user_ids,))
        squads_deleted = cursor.rowcount

        return {
            "users": len(user_ids),
            "squads": squads_deleted,
            "squadplayers": squadplayers_deleted,
            "transfers": transfers_deleted,
        }
    finally:
        cursor.close()


def upsert_public_user(conn, account, auth_user_id):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (username, auth_user_id, display_name, role, is_active)
            VALUES (%s, %s, %s, 'user', true)
            ON CONFLICT (username) DO UPDATE
            SET auth_user_id = EXCLUDED.auth_user_id,
                display_name = EXCLUDED.display_name,
                role = 'user',
                is_active = true
            RETURNING user_id
            """,
            (account["username"], auth_user_id, account["display_name"]),
        )
        return cursor.fetchone()["user_id"]
    finally:
        cursor.close()


def insert_squad(conn, user_id, matchday, pick):
    players = pick["players"]
    captain = pick["captain"]
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO squad (user_id, matchday, budget_used)
            VALUES (%s, %s, %s)
            RETURNING squad_id
            """,
            (user_id, matchday, pick["budget"]),
        )
        squad_id = cursor.fetchone()["squad_id"]
        for player in players:
            cursor.execute(
                """
                INSERT INTO squadplayer (squad_id, player_id, is_captain)
                VALUES (%s, %s, %s)
                """,
                (squad_id, player["player_id"], player["player_id"] == captain["player_id"]),
            )
        return squad_id
    finally:
        cursor.close()


def insert_transfer_rows(conn, user_id, matchday, previous_pick, current_pick):
    pairs = transfer_pairs(previous_pick["players"], current_pick["players"])
    if pairs is None or len(pairs) != 5:
        raise RuntimeError("Expected exactly 5 transfer pairs for matchday " + str(matchday))
    cursor = conn.cursor()
    try:
        for out_player, in_player in pairs:
            cursor.execute(
                """
                INSERT INTO transfers (user_id, player_in_id, player_out_id, matchday)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, in_player["player_id"], out_player["player_id"], matchday),
            )
    finally:
        cursor.close()


def apply_seed(conn, plan, admin_client):
    accounts = []
    for manager in plan:
        accounts.append(manager["account"])

    reset_summary = reset_public_seed_rows(conn, accounts)
    auth_created = 0
    auth_reused = 0

    auth_index = {}
    for user in admin_client.list_users():
        email = (user.get("email") or "").lower()
        if email:
            auth_index[email] = user

    for manager in plan:
        account = manager["account"]
        existing = auth_index.get(account["email"].lower())
        auth_user, created = admin_client.create_or_update_user(account, existing=existing)
        if created:
            auth_created += 1
            auth_index[account["email"].lower()] = auth_user
        else:
            auth_reused += 1
        user_id = upsert_public_user(conn, account, auth_user["id"])
        previous_pick = None
        for index, pick in enumerate(manager["picks"], start=1):
            matchday = index
            insert_squad(conn, user_id, matchday, pick)
            if previous_pick is not None:
                insert_transfer_rows(conn, user_id, matchday, previous_pick, pick)
            previous_pick = pick

    return {"reset": reset_summary, "auth_created": auth_created, "auth_reused": auth_reused}


def build_plan_from_db(conn):
    assert_live_shape(conn)
    scored_players = fetch_scored_players(conn)
    current_players = fetch_current_players(conn)
    admin_score = get_admin_score(conn)
    return select_seed_plan(scored_players, current_players, admin_score), admin_score


def serialize_plan(plan, path):
    payload = {"managers": []}
    for manager_index, manager in enumerate(plan):
        manager_payload = {"index": manager_index, "picks": [], "total_score": str(manager["total_score"])}
        for pick in manager["picks"]:
            players = []
            for player in pick["players"]:
                players.append(
                    {
                        "player_id": player["player_id"],
                        "name": player["name"],
                        "position": player["position"],
                        "team_id": player["team_id"],
                        "base_price": str(player["base_price"]),
                        "md_score": str(player.get("md_score", Decimal("0"))),
                    }
                )
            manager_payload["picks"].append(
                {
                    "players": players,
                    "captain_player_id": pick["captain"]["player_id"],
                    "budget": str(pick["budget"]),
                    "score": str(pick["score"]),
                }
            )
        payload["managers"].append(manager_payload)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_serialized_plan(path, password=default_password):
    payload = json.loads(path.read_text(encoding="utf-8"))
    accounts = account_specs(password)
    plan = []
    for manager_payload in payload["managers"]:
        manager_index = manager_payload["index"]
        picks = []
        for pick_payload in manager_payload["picks"]:
            players = []
            for player_payload in pick_payload["players"]:
                row = dict(player_payload)
                row["base_price"] = Decimal(row["base_price"])
                row["md_score"] = Decimal(row.get("md_score", "0"))
                players.append(row)
            captain = None
            for player in players:
                if player["player_id"] == pick_payload["captain_player_id"]:
                    captain = player
                    break
            if captain is None:
                captain = choose_captain(players)
            picks.append(
                {
                    "players": players,
                    "ids": set(player["player_id"] for player in players),
                    "budget": Decimal(pick_payload["budget"]),
                    "score": Decimal(pick_payload["score"]),
                    "captain": captain,
                }
            )
        plan.append(
            {
                "account": accounts[manager_index],
                "picks": picks,
                "total_score": Decimal(manager_payload["total_score"]),
            }
        )
    return plan


def print_summary(summary):
    print("Managers:", summary["manager_count"], flush=True)
    print("Squads:", summary["squad_count"], flush=True)
    print("Fake managers above admin:", summary["above_admin"], flush=True)
    print(
        "Per-MD score min/avg/max:",
        summary["score_min"],
        round(summary["score_avg"], 2),
        summary["score_max"],
    )
    print(
        "Cumulative score min/avg/max:",
        summary["total_min"],
        round(summary["total_avg"], 2),
        summary["total_max"],
    )
    print(
        "Budget min/avg/max:",
        summary["budget_min"],
        round(summary["budget_avg"], 2),
        summary["budget_max"],
    )
    print("Unique players used:", summary["unique_players"])
    print("Max player usage:", summary["max_player_usage"])


def seed_main(argv=None):
    parser = argparse.ArgumentParser(description="Seed 20 login-able demo fantasy managers.")
    parser.add_argument("--apply", action="store_true", help="Write to Supabase Auth and public fantasy tables.")
    parser.add_argument("--dry-run", action="store_true", help="Preview seed shape without writing.")
    parser.add_argument("--password", default=default_password, help="Shared demo account password.")
    parser.add_argument("--write-plan", help="Write generated fantasy plan JSON to this path.")
    parser.add_argument("--use-plan", help="Load fantasy plan JSON from this path instead of regenerating.")
    args = parser.parse_args(argv)

    if args.apply and args.dry_run:
        raise SystemExit("Choose either --apply or --dry-run, not both.")
    if args.write_plan and args.use_plan:
        raise SystemExit("Choose either --write-plan or --use-plan, not both.")
    if not args.apply:
        args.dry_run = True

    env_keys = ["DATABASE_URL"]
    if args.apply:
        env_keys.extend(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])
    env = require_env(env_keys)

    conn = connect_db()
    try:
        admin_score = get_admin_score(conn)
        if args.use_plan:
            plan = load_serialized_plan(Path(args.use_plan), password=args.password)
        else:
            plan, admin_score = build_plan_from_db(conn)
            if args.password != default_password:
                for manager in plan:
                    manager["account"]["password"] = args.password
        summary = summarize_plan(plan, admin_score)
        print("Admin score baseline:", admin_score, flush=True)
        print_summary(summary)
        if args.write_plan:
            serialize_plan(plan, Path(args.write_plan))
            print("Wrote plan:", args.write_plan, flush=True)

        if args.dry_run:
            print("Dry run only. Re-run with --apply to write rows.", flush=True)
            return 0

        admin_client = SupabaseAdmin(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
        apply_summary = apply_seed(conn, plan, admin_client)
        conn.commit()
        print("Applied seed.")
        print("Auth users created:", apply_summary["auth_created"])
        print("Auth users reused:", apply_summary["auth_reused"])
        print("Reset summary:", apply_summary["reset"])
        return 0
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(seed_main())

