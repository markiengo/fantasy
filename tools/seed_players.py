"""
seed_players.py — populate player from ESPN rosters; build tools/maps/idmap.json.

    python tools/seed_players.py [--dry-run]

Idempotent: upserts on espn_id (refreshes name/position/team; never overwrites base_price).
Flat prices keep any valid 11-player squad under $50M: GK/DEF $4.0, MID $4.5, FWD $5.0.
"""

import argparse
import json
import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import espn_client as espn

maps_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maps")
position_price = {"GK": 4.0, "DEF": 4.0, "MID": 4.5, "FWD": 5.0}


def seed(dry_run):
    teams = espn.teams()
    print("Fetching rosters from ESPN (~%d requests)..." % len(teams))

    all_players = []
    for team in teams:
        for player in espn.roster(team["espn_id"]):
            all_players.append({
                "espn_id":   player["espn_id"],
                "team_id":   team["team_id"],
                "name":      player["name"],
                "position":  player["position"],
                "base_price": position_price.get(player["position"], 4.0),
            })

    print("Players from ESPN: %d" % len(all_players))

    if dry_run:
        print("\n--- DRY RUN ---")
        for p in all_players[:10]:
            print("  %s: %s (%s) %s $%.1fM" % (
                p["espn_id"], p["name"], p["team_id"], p["position"], p["base_price"]))
        return

    load_dotenv()
    conn = psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)
    cur = conn.cursor()

    idmap = {}
    inserted = updated = 0

    for p in all_players:
        cur.execute("SELECT player_id FROM player WHERE espn_id = %s", (p["espn_id"],))
        row = cur.fetchone()
        if row:
            player_id = row["player_id"]
            cur.execute(
                "UPDATE player SET team_id = %s, name = %s, position = %s WHERE player_id = %s",
                (p["team_id"], p["name"], p["position"], player_id),
            )
            updated += 1
        else:
            cur.execute(
                "INSERT INTO player (espn_id, team_id, name, position, base_price) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING player_id",
                (p["espn_id"], p["team_id"], p["name"], p["position"], p["base_price"]),
            )
            player_id = cur.fetchone()["player_id"]
            inserted += 1
        idmap[p["espn_id"]] = player_id

    conn.commit()
    cur.close()
    conn.close()

    os.makedirs(maps_dir, exist_ok=True)
    with open(os.path.join(maps_dir, "idmap.json"), "w", encoding="utf-8") as f:
        json.dump(idmap, f, indent=2)

    print("\nDone. new=%d  updated=%d  total=%d" % (inserted, updated, len(idmap)))
    print("Wrote tools/maps/idmap.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    seed(ap.parse_args().dry_run)


if __name__ == "__main__":
    main()
