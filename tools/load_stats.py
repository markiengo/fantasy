"""
load_stats.py — load per-match player stats from ESPN into playerstat.

    python tools/load_stats.py --date 20260613
    python tools/load_stats.py --from 20260611 --to 20260615
    python tools/load_stats.py --date 20260613 --dry-run

Run with uvicorn up. Idempotent — existing stats come back as 400 and are skipped.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import espn_client as espn

maps_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maps")


def load_map(name):
    path = os.path.join(maps_dir, name)
    if not os.path.exists(path):
        sys.exit("Missing %s — run seed_foundation.py and seed_players.py first." % path)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def date_range(args):
    if args.date:
        return [args.date]
    if args.from_date and args.to_date:
        out = []
        d = datetime.strptime(args.from_date, "%Y%m%d")
        end = datetime.strptime(args.to_date, "%Y%m%d")
        while d <= end:
            out.append(d.strftime("%Y%m%d"))
            d = d + timedelta(days=1)
        return out
    sys.exit("Provide --date YYYYMMDD or --from YYYYMMDD --to YYYYMMDD.")


def post_stat(server, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        server + "/api/playerstats",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:  # nosec - local dev API
            return "ok", json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        if e.code == 400 and "already exists" in raw:
            return "exists", raw
        return "error", "%d %s" % (e.code, raw)
    except urllib.error.URLError as e:
        sys.exit("Cannot reach the API at %s — is uvicorn running? (%s)" % (server, e))


def run(args):
    idmap = load_map("idmap.json")
    matchmap = load_map("matchmap.json")

    totals = {"posted": 0, "skipped_exists": 0, "errors": 0, "no_map": 0}

    for ymd in date_range(args):
        events = espn.scoreboard(ymd)
        for e in events:
            if not e["completed"]:
                print("  %s %s vs %s — not finished, skipping" % (e["date"], e["home"], e["away"]))
                continue

            match_id = matchmap.get(e["event_id"])
            if match_id is None:
                print("  %s %s vs %s — match not seeded, skipping" % (e["date"], e["home"], e["away"]))
                continue

            stats = espn.match_player_stats(e["event_id"])
            posted = 0
            for ps in stats:
                if not ps["appeared"]:
                    continue
                player_id = idmap.get(ps["espn_id"])
                if player_id is None:
                    totals["no_map"] += 1
                    continue

                conceded = e["away_score"] if ps["team"] == e["home"] else e["home_score"]
                body = {
                    "player_id": player_id,
                    "match_id": match_id,
                    "goals": ps["goals"],
                    "assists": ps["assists"],
                    "minutes_played": ps["minutes"],
                    "yellow_cards": ps["yellow"],
                    "red_cards": ps["red"],
                    "clean_sheet": 1 if conceded == 0 else 0,
                }

                if args.dry_run:
                    posted += 1
                    continue

                status, detail = post_stat(args.server, body)
                if status == "ok":
                    totals["posted"] += 1
                    posted += 1
                elif status == "exists":
                    totals["skipped_exists"] += 1
                else:
                    totals["errors"] += 1
                    print("    ! player %s: %s" % (player_id, detail))

            tag = "would post" if args.dry_run else "posted"
            print("  %s %s %s-%s %s — %d players %s" % (
                e["date"], e["home"], e["home_score"], e["away_score"], e["away"], posted, tag))

    print("\nDone. posted=%d  skipped(existing)=%d  errors=%d  unmapped_players=%d" % (
        totals["posted"], totals["skipped_exists"], totals["errors"], totals["no_map"]))


def main():
    ap = argparse.ArgumentParser(description="Load per-match player stats from ESPN.")
    ap.add_argument("--date", help="single date YYYYMMDD")
    ap.add_argument("--from", dest="from_date", help="range start YYYYMMDD")
    ap.add_argument("--to", dest="to_date", help="range end YYYYMMDD")
    ap.add_argument("--server", default="http://127.0.0.1:8000", help="API base URL")
    ap.add_argument("--dry-run", action="store_true", help="compute + print only; no POSTs")
    args = ap.parse_args()
    run(args)


if __name__ == "__main__":
    main()
