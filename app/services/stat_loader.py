import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

from app.queries.match import get_match, update_match_score, get_match_dates_without_stats, advance_bracket_winner, find_match_by_teams
from app.queries.playerstat import post_playerstats_batch
from tools import espn_client as espn


def repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def load_map(name):
    path = os.path.join(repo_root(), "tools", "maps", name)
    if not os.path.exists(path):
        raise FileNotFoundError("Missing " + path)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def date_range(date_value=None, from_date=None, to_date=None, conn=None):
    if date_value:
        return [date_value]

    if from_date or to_date:
        if not from_date or not to_date:
            raise ValueError("from_date and to_date must be provided together")

    if from_date and to_date:
        out = []
        current = datetime.strptime(from_date, "%Y%m%d")
        end = datetime.strptime(to_date, "%Y%m%d")
        if end < current:
            raise ValueError("to_date must be on or after from_date")
        while current <= end:
            out.append(current.strftime("%Y%m%d"))
            current = current + timedelta(days=1)
        return out

    if conn is not None:
        missing_dates = get_match_dates_without_stats(conn)
        if missing_dates:
            dates = set()
            for d in missing_dates:
                dates.add(d.strftime("%Y%m%d"))
                dates.add((d - timedelta(days=1)).strftime("%Y%m%d"))
            return sorted(dates)

    return [datetime.utcnow().strftime("%Y%m%d")]


def stat_body(player_id, match_id, event, player_stat):
    conceded = event["away_score"]
    if player_stat["team"] != event["home"]:
        conceded = event["home_score"]

    clean_sheet = 0
    if conceded == 0:
        clean_sheet = 1

    return {
        "player_id": player_id,
        "match_id": match_id,
        "goals": player_stat["goals"],
        "assists": player_stat["assists"],
        "minutes_played": player_stat["minutes"],
        "yellow_cards": player_stat["yellow"],
        "red_cards": player_stat["red"],
        "clean_sheet": clean_sheet,
        "saves": player_stat.get("saves", 0),
        "own_goals": player_stat.get("own_goals", 0),
        "shots_on_target": player_stat.get("shots_on_target", 0),
        "fouls_committed": player_stat.get("fouls_committed", 0),
        "offsides": player_stat.get("offsides", 0),
        "goals_conceded": player_stat.get("goals_conceded", 0),
        "penalty_saves": player_stat.get("penalty_saves", 0),
    }


def update_event_score(conn, match_id, event):
    match = get_match(conn, match_id)
    if not match:
        return False

    team1_score = event["home_score"]
    team2_score = event["away_score"]
    team1_penalty = event.get("home_penalty")
    team2_penalty = event.get("away_penalty")
    if match["team1_id"] != event["home"]:
        team1_score = event["away_score"]
        team2_score = event["home_score"]
        team1_penalty = event.get("away_penalty")
        team2_penalty = event.get("home_penalty")

    update_match_score(conn, match_id, team1_score, team2_score, team1_penalty, team2_penalty)
    return True


def load_stats(conn, date_value=None, from_date=None, to_date=None, dry_run=False):
    idmap = load_map("idmap.json")
    matchmap = load_map("matchmap.json")
    days = date_range(date_value, from_date, to_date, conn=conn)

    totals = {
        "dates": days,
        "matches_seen": 0,
        "matches_completed": 0,
        "matches_updated": 0,
        "inserted": 0,
        "skipped_existing": 0,
        "skipped_unmapped_player": 0,
        "skipped_unmapped_match": 0,
        "errors": 0,
        "errors_detail": [],
    }

    # --- Phase 1: fetch all scoreboards in parallel ---
    scoreboards = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        future_to_ymd = {
            pool.submit(espn.scoreboard, ymd): ymd
            for ymd in days
        }
        for future in as_completed(future_to_ymd):
            ymd = future_to_ymd[future]
            try:
                scoreboards[ymd] = future.result()
            except Exception as exc:
                totals["errors"] = totals["errors"] + 1
                totals["errors_detail"].append({
                    "date": ymd,
                    "error": "Scoreboard fetch failed: " + str(exc),
                })
                scoreboards[ymd] = []

    # --- Phase 2: collect completed, mapped events ---
    pending = []
    for ymd in days:
        events = scoreboards.get(ymd, [])
        for event in events:
            totals["matches_seen"] = totals["matches_seen"] + 1
            if not event["completed"]:
                continue

            totals["matches_completed"] = totals["matches_completed"] + 1
            match_id = matchmap.get(event["event_id"])
            if match_id is None:
                match_id = find_match_by_teams(conn, event["home"], event["away"], event["stage"])
            if match_id is None:
                totals["skipped_unmapped_match"] = totals["skipped_unmapped_match"] + 1
                continue

            pending.append((event, match_id))

    # --- Phase 3: fetch all match summaries in parallel ---
    summaries = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        future_to_event = {
            pool.submit(espn.match_player_stats, event["event_id"]): (event, match_id)
            for event, match_id in pending
        }
        for future in as_completed(future_to_event):
            event, match_id = future_to_event[future]
            try:
                summaries[match_id] = (event, future.result())
            except Exception as exc:
                totals["errors"] = totals["errors"] + 1
                totals["errors_detail"].append({
                    "match_id": match_id,
                    "error": "Summary fetch failed: " + str(exc),
                })
                summaries[match_id] = (event, [])

    # --- Phase 4: update scores + batch insert stats (sequential DB) ---
    for event, match_id in pending:
        if dry_run:
            totals["matches_updated"] = totals["matches_updated"] + 1
        else:
            if update_event_score(conn, match_id, event):
                totals["matches_updated"] = totals["matches_updated"] + 1
                advance_bracket_winner(conn, match_id)

        event_data = summaries.get(match_id)
        if event_data is None:
            continue
        _, player_stats = event_data

        batch = []
        for player_stat in player_stats:
            if not player_stat["appeared"]:
                continue

            player_id = idmap.get(player_stat["espn_id"])
            if player_id is None:
                totals["skipped_unmapped_player"] = totals["skipped_unmapped_player"] + 1
                continue

            body = stat_body(player_id, match_id, event, player_stat)
            batch.append(body)

        if dry_run:
            totals["inserted"] = totals["inserted"] + len(batch)
            continue

        if not batch:
            continue

        try:
            inserted, skipped = post_playerstats_batch(conn, match_id, batch)
            totals["inserted"] = totals["inserted"] + inserted
            totals["skipped_existing"] = totals["skipped_existing"] + skipped
        except Exception as exc:
            totals["errors"] = totals["errors"] + 1
            totals["errors_detail"].append({
                "match_id": match_id,
                "error": str(exc),
            })

    return totals
