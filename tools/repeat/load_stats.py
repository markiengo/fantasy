"""
load_stats.py — load per-match player stats from ESPN via the API.

    python tools/repeat/load_stats.py --token <JWT> --date 20260613
    python tools/repeat/load_stats.py --token <JWT> --from 20260611 --to 20260615
    python tools/repeat/load_stats.py --token <JWT> --date 20260613 --dry-run

Calls POST /load-stats on the running API server. Requires a valid admin JWT.
The server must be running (uvicorn app.main:app).

Idempotent — existing stats are skipped via ON CONFLICT DO NOTHING.
"""

import argparse
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()


def main():
    ap = argparse.ArgumentParser(description="Load per-match player stats from ESPN via API.")
    ap.add_argument("--token", required=True, help="Admin JWT token (Bearer)")
    ap.add_argument("--date", help="single date YYYYMMDD")
    ap.add_argument("--from", dest="from_date", help="range start YYYYMMDD")
    ap.add_argument("--to", dest="to_date", help="range end YYYYMMDD")
    ap.add_argument("--dry-run", action="store_true", help="compute + print only; no DB writes")
    ap.add_argument("--url", default="http://127.0.0.1:8000", help="API base URL (default: http://127.0.0.1:8000)")
    args = ap.parse_args()

    if not args.date and not (args.from_date and args.to_date):
        sys.exit("Provide --date YYYYMMDD or --from YYYYMMDD --to YYYYMMDD.")

    payload = {}
    if args.date:
        payload["date"] = args.date
    if args.from_date:
        payload["from_date"] = args.from_date
    if args.to_date:
        payload["to_date"] = args.to_date
    if args.dry_run:
        payload["dry_run"] = True

    headers = {
        "Authorization": "Bearer " + args.token,
        "Content-Type": "application/json",
    }

    url = args.url.rstrip("/") + "/api/load-stats"

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=120)
    except httpx.ConnectError:
        sys.exit("Could not connect to %s — is the server running?" % url)

    if resp.status_code == 401:
        sys.exit("Unauthorized — token is invalid or expired.")
    if resp.status_code == 403:
        sys.exit("Forbidden — this account does not have admin role.")
    if resp.status_code != 200:
        sys.exit("Request failed (%d): %s" % (resp.status_code, resp.text))

    result = resp.json()
    print("\nResult:")
    for key in result:
        if key == "errors_detail":
            if result[key]:
                print("  errors_detail:")
                for detail in result[key]:
                    print("    %s" % detail)
        else:
            print("  %s: %s" % (key, result[key]))


if __name__ == "__main__":
    main()
