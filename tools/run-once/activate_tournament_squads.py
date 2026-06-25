"""
activate_tournament_squads.py — match tools/maps/tournament_squad.json (from Wikipedia)
against the live player table, set in_tournament = true for matches, insert any
Wikipedia players missing from the DB, and assign sensible prices.

    python tools/run-once/activate_tournament_squads.py [--dry-run]

Matching strategy (per team):
  1. Exact normalized name match (lowercase, strip accents, remove punctuation).
  2. Fuzzy match using difflib if no exact match (threshold 0.6).
  3. If still no match, insert a new player row.

Pricing:
  - Players already in the DB keep their existing base_price.
  - Newly inserted players get a position-based default:
      GK 4.0, DEF 4.0, MID 4.5, FWD 5.0
  - The 67 historical rows (espn_id IS NULL) that match Wikipedia keep their
    existing price if they have one; otherwise they get the position default.
"""

import argparse
import json
import os
import sys
import unicodedata
import difflib

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

tools_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
maps_dir = os.path.join(tools_dir, "maps")

position_default_price = {"GK": 4.0, "DEF": 4.0, "MID": 4.5, "FWD": 5.0}

fuzzy_threshold = 0.65


def normalize_name(name):
    """Lowercase, strip accents, remove punctuation, collapse spaces."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = nfkd.encode("ascii", "ignore").decode("ascii")
    cleaned = []
    for ch in ascii_only.lower():
        if ch.isalpha() or ch.isspace():
            cleaned.append(ch)
    return " ".join("".join(cleaned).split())


def load_squad_map():
    path = os.path.join(maps_dir, "tournament_squad.json")
    if not os.path.exists(path):
        sys.exit("Missing %s — run scrape_wikipedia_squads.py first." % path)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def run(dry_run):
    load_dotenv()
    conn = psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)
    cur = conn.cursor()

    squads = load_squad_map()

    # Reset: everyone starts as not in tournament
    if not dry_run:
        cur.execute("UPDATE player SET in_tournament = false")
        print("Reset in_tournament = false for all players.\n")

    stats = {
        "exact_match": 0,
        "fuzzy_match": 0,
        "inserted": 0,
        "unmatched_wiki": 0,
        "activated": 0,
    }

    unmatched = []

    for team_id in sorted(squads.keys()):
        wiki_players = squads[team_id]

        # Fetch all DB players for this team
        cur.execute(
            "SELECT player_id, name, position, base_price, espn_id FROM player WHERE team_id = %s",
            (team_id,),
        )
        db_rows = cur.fetchall()

        # Build normalized name → row index
        db_norm = {}
        for row in db_rows:
            norm = normalize_name(row["name"])
            if norm not in db_norm:
                db_norm[norm] = row

        # Track which DB rows we've matched so we don't double-match
        matched_db_ids = set()

        for wp in wiki_players:
            w_norm = normalize_name(wp["name"])

            # 1. Exact normalized match
            match = db_norm.get(w_norm)

            # 2. Fuzzy match
            if match is None:
                best_ratio = 0.0
                best_row = None
                for norm_key, row in db_norm.items():
                    if row["player_id"] in matched_db_ids:
                        continue
                    ratio = difflib.SequenceMatcher(None, w_norm, norm_key).ratio()
                    if ratio > best_ratio:
                        best_ratio = ratio
                        best_row = row
                if best_ratio >= fuzzy_threshold:
                    match = best_row
                    stats["fuzzy_match"] += 1
                    print("  [%s] FUZZY: wiki '%s' ~= db '%s' (%.2f)" % (
                        team_id, wp["name"], match["name"], best_ratio))
                else:
                    # 3. Insert new player
                    price = position_default_price.get(wp["position"], 4.0)
                    if dry_run:
                        stats["inserted"] += 1
                        print("  [%s] INSERT (dry-run): %s (%s) $%.1f" % (
                            team_id, wp["name"], wp["position"], price))
                    else:
                        cur.execute(
                            "INSERT INTO player (name, position, team_id, base_price, in_tournament) "
                            "VALUES (%s, %s, %s, %s, true) RETURNING player_id",
                            (wp["name"], wp["position"], team_id, price),
                        )
                        new_id = cur.fetchone()["player_id"]
                        matched_db_ids.add(new_id)
                        stats["inserted"] += 1
                        print("  [%s] INSERT: %s (%s) $%.1f -> player_id %d" % (
                            team_id, wp["name"], wp["position"], price, new_id))
                    stats["activated"] += 1
                    continue

            if match is not None:
                matched_db_ids.add(match["player_id"])
                if not dry_run:
                    cur.execute(
                        "UPDATE player SET in_tournament = true WHERE player_id = %s",
                        (match["player_id"],),
                    )
                if w_norm == normalize_name(match["name"]):
                    stats["exact_match"] += 1
                stats["activated"] += 1

        # Report DB players for this team that were NOT matched (not in Wikipedia)
        for row in db_rows:
            if row["player_id"] not in matched_db_ids:
                unmatched.append({
                    "team_id": team_id,
                    "player_id": row["player_id"],
                    "name": row["name"],
                    "position": row["position"],
                    "espn_id": row["espn_id"],
                })

    if not dry_run:
        conn.commit()

    stats["unmatched_wiki"] = len(unmatched)

    print("\n=== Summary ===")
    print("  Exact matches:   %d" % stats["exact_match"])
    print("  Fuzzy matches:   %d" % stats["fuzzy_match"])
    print("  Inserted:        %d" % stats["inserted"])
    print("  Activated:       %d" % stats["activated"])
    print("  DB rows NOT in Wikipedia (left in_tournament=false): %d" % stats["unmatched_wiki"])

    if unmatched:
        print("\n--- DB players not in Wikipedia squad (left inactive) ---")
        by_team = {}
        for u in unmatched:
            by_team.setdefault(u["team_id"], []).append(u)
        for team_id in sorted(by_team.keys()):
            print("  %s (%d):" % (team_id, len(by_team[team_id])))
            for u in by_team[team_id]:
                espn_tag = "espn=%s" % u["espn_id"] if u["espn_id"] else "NO-ESPN"
                print("    %4d  %-30s  %s  %s" % (u["player_id"], u["name"], u["position"], espn_tag))

    cur.close()
    conn.close()


def main():
    ap = argparse.ArgumentParser(description="Apply Wikipedia tournament squad to DB.")
    ap.add_argument("--dry-run", action="store_true", help="match + print only; no DB writes")
    run(ap.parse_args().dry_run)


if __name__ == "__main__":
    main()
