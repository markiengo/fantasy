"""
seed_foundation.py — populate users, team, and match from ESPN; build tools/maps/matchmap.json.

    python tools/seed_foundation.py [--dry-run]

Idempotent: teams upsert on team_id; matches skip if (team1, team2, stage) already exists.
Re-run after knockout draws to back-fill fixtures once teams are known.
"""

import argparse
import json
import os
import sys
from datetime import date, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import espn_client as espn

tournament_start = date(2026, 6, 11)
tournament_end   = date(2026, 7, 19)

knockout_matchday = {
    "round_of_32":  4,
    "round_of_16":  5,
    "quarter_final": 6,
    "semi_final":   7,
    "final":        8,
}

maps_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maps")


def date_strings():
    out = []
    d = tournament_start
    while d <= tournament_end:
        out.append(d.strftime("%Y%m%d"))
        d = d + timedelta(days=1)
    return out


def collect_events():
    events = []
    for ymd in date_strings():
        for e in espn.scoreboard(ymd):
            events.append(e)
    return events


def assign_matchdays(events, valid_team_ids):
    playable = [e for e in events if e["home"] in valid_team_ids and e["away"] in valid_team_ids]

    # group stage: matchday = max appearance count of either team so far, +1
    group_events = sorted(
        [e for e in playable if e["stage"] == "group_stage"],
        key=lambda e: (e["date"], int(e["event_id"]))
    )
    appearances = {}
    for e in group_events:
        nth = max(appearances.get(e["home"], 0), appearances.get(e["away"], 0)) + 1
        e["matchday"] = nth
        appearances[e["home"]] = nth
        appearances[e["away"]] = nth

    for e in playable:
        if e["stage"] != "group_stage":
            e["matchday"] = knockout_matchday.get(e["stage"], 8)

    return playable


def seed(dry_run):
    teams = espn.teams()
    valid_team_ids = set(t["team_id"] for t in teams)

    print("Fetching fixtures from ESPN (~%d requests)..." % (
        (tournament_end - tournament_start).days + 1))
    events = collect_events()
    matches = assign_matchdays(events, valid_team_ids)

    print("Teams: %d  |  Fixtures with teams: %d  |  TBD (knockout): %d" % (
        len(teams), len(matches), len(events) - len(matches)))

    if dry_run:
        print("\n--- DRY RUN ---")
        for t in teams[:5]:
            print("  team", t["team_id"], t["name"])
        for m in sorted(matches, key=lambda x: (x["matchday"], x["date"]))[:8]:
            print("  md%d %s %s vs %s (%s)" % (
                m["matchday"], m["date"], m["home"], m["away"], m["stage"]))
        return

    load_dotenv()
    conn = psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)
    cur = conn.cursor()

    cur.execute("INSERT INTO users (user_id, username) VALUES (1, 'me') ON CONFLICT (user_id) DO NOTHING")

    for t in teams:
        cur.execute(
            "INSERT INTO team (team_id, name) VALUES (%s, %s) "
            "ON CONFLICT (team_id) DO UPDATE SET name = EXCLUDED.name",
            (t["team_id"], t["name"]),
        )

    # re-sync SERIAL sequence in case rows were inserted with explicit ids
    cur.execute(
        "SELECT setval(pg_get_serial_sequence('match', 'match_id'), "
        "COALESCE((SELECT MAX(match_id) FROM match), 1))"
    )

    matchmap = {}
    inserted = updated = 0
    for m in matches:
        cur.execute(
            "SELECT match_id, team1_id, team2_id FROM match WHERE stage = %s AND "
            "((team1_id = %s AND team2_id = %s) OR (team1_id = %s AND team2_id = %s))",
            (m["stage"], m["home"], m["away"], m["away"], m["home"]),
        )
        row = cur.fetchone()
        if row:
            match_id = row["match_id"]
            t1_score = m["home_score"] if row["team1_id"] == m["home"] else m["away_score"]
            t2_score = m["away_score"] if row["team1_id"] == m["home"] else m["home_score"]
            cur.execute(
                "UPDATE match SET team1_score = %s, team2_score = %s WHERE match_id = %s",
                (t1_score, t2_score, match_id),
            )
            updated += 1
        else:
            cur.execute(
                "INSERT INTO match (team1_id, team2_id, matchday, stage, date, team1_score, team2_score) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING match_id",
                (m["home"], m["away"], m["matchday"], m["stage"], m["date"],
                 m["home_score"], m["away_score"]),
            )
            match_id = cur.fetchone()["match_id"]
            inserted += 1
        matchmap[m["event_id"]] = match_id

    conn.commit()
    cur.close()
    conn.close()

    os.makedirs(maps_dir, exist_ok=True)
    with open(os.path.join(maps_dir, "matchmap.json"), "w", encoding="utf-8") as f:
        json.dump(matchmap, f, indent=2)

    print("\nDone. teams=%d  new matches=%d  updated=%d  total mapped=%d" % (
        len(teams), inserted, updated, len(matchmap)))
    print("Wrote tools/maps/matchmap.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    seed(ap.parse_args().dry_run)


if __name__ == "__main__":
    main()
