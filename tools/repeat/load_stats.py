"""
load_stats.py — load per-match player stats from ESPN into playerstat.

    python tools/repeat/load_stats.py --date 20260613
    python tools/repeat/load_stats.py --from 20260611 --to 20260615
    python tools/repeat/load_stats.py --date 20260613 --dry-run

Connects directly to the database via DATABASE_URL (from .env).
No API server needed — calls load_stats() from app/services/stat_loader.py.
Idempotent — existing stats are skipped via ON CONFLICT DO NOTHING.
"""

import argparse
import os
import sys

repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, repo_root)

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

from app.services.stat_loader import load_stats


def main():
    ap = argparse.ArgumentParser(description="Load per-match player stats from ESPN.")
    ap.add_argument("--date", help="single date YYYYMMDD")
    ap.add_argument("--from", dest="from_date", help="range start YYYYMMDD")
    ap.add_argument("--to", dest="to_date", help="range end YYYYMMDD")
    ap.add_argument("--dry-run", action="store_true", help="compute + print only; no DB writes")
    args = ap.parse_args()

    if not args.date and not (args.from_date and args.to_date):
        sys.exit("Provide --date YYYYMMDD or --from YYYYMMDD --to YYYYMMDD.")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        sys.exit("DATABASE_URL not set — check your .env file.")

    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    try:
        result = load_stats(
            conn,
            date_value=args.date,
            from_date=args.from_date,
            to_date=args.to_date,
            dry_run=args.dry_run,
        )
        print("\nResult:")
        for key in result:
            if key == "errors_detail":
                if result[key]:
                    print("  errors_detail:")
                    for detail in result[key]:
                        print("    %s" % detail)
            else:
                print("  %s: %s" % (key, result[key]))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
