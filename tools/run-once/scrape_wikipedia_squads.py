"""
scrape_wikipedia_squads.py — scrape the 2026 FIFA World Cup squads from Wikipedia
and produce tools/maps/tournament_squad.json, the canonical list of who is
actually in the tournament.

    python tools/run-once/scrape_wikipedia_squads.py [--dry-run]

Output format:
    {
      "BRA": [
        {"name": "Alisson", "position": "GK"},
        {"name": "Marquinhos", "position": "DEF"},
        ...
      ],
      ...
    }

Wikipedia is the parsed, community-maintained version of the FIFA PDF squad
lists. It is the only source that is both authoritative and machine-readable
without fragile PDF parsing. Run once after FIFA publishes the final squads
(early June 2026) and re-run if injury replacements are announced.
"""

import argparse
import json
import os
import sys
import urllib.request

from bs4 import BeautifulSoup

tools_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
maps_dir = os.path.join(tools_dir, "maps")

wiki_url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads"

# Wikipedia section heading → our team_id (3-letter FIFA code).
# Only the mismatches need explicit entries; the rest fall back to
# matching against the DB team name.
wiki_name_to_team_id = {
    "Czech Republic":           "CZE",
    "Bosnia and Herzegovina":   "BIH",
    "Turkey":                   "TUR",
    "DR Congo":                 "COD",
    "Ivory Coast":              "CIV",
    "South Korea":              "KOR",
    "United States":            "USA",
    "Netherlands":              "NED",
    "Cape Verde":               "CPV",
    "Saudi Arabia":             "KSA",
    "New Zealand":              "NZL",
    "South Africa":             "RSA",
    "Curaçao":                  "CUW",
    "Iran":                     "IRN",
    "Australia":                "AUS",
    "Egypt":                    "EGY",
    "Morocco":                  "MAR",
    "Senegal":                  "SEN",
    "Algeria":                  "ALG",
    "Argentina":                "ARG",
    "Austria":                  "AUT",
    "Jordan":                   "JOR",
    "Colombia":                 "COL",
    "Portugal":                 "POR",
    "Uzbekistan":               "UZB",
    "Croatia":                  "CRO",
    "England":                  "ENG",
    "Ghana":                    "GHA",
    "Panama":                   "PAN",
    "Belgium":                  "BEL",
    "Norway":                   "NOR",
    "Iraq":                     "IRQ",
    "France":                   "FRA",
    "Spain":                    "ESP",
    "Uruguay":                  "URU",
    "Japan":                    "JPN",
    "Sweden":                   "SWE",
    "Tunisia":                  "TUN",
    "Germany":                  "GER",
    "Ecuador":                  "ECU",
    "Paraguay":                 "PAR",
    "Switzerland":              "SUI",
    "Canada":                   "CAN",
    "Qatar":                    "QAT",
    "Brazil":                   "BRA",
    "Haiti":                    "HAI",
    "Scotland":                 "SCO",
    "Mexico":                   "MEX",
}

# Wikipedia position abbreviation → our position code
pos_map = {
    "GK": "GK",
    "DF": "DEF",
    "MF": "MID",
    "FW": "FWD",
}


def fetch_html(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "fantasy-wc2026/1.0 (research; contact@example.com)"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:  # nosec - public page
        return r.read().decode("utf-8", errors="replace")


def parse_squads(html):
    """Parse the Wikipedia page and return {team_id: [{name, position}, ...]}."""
    soup = BeautifulSoup(html, "html.parser")

    # Each squad is under an <h3> heading (e.g. "=== Brazil ===")
    # followed by a <table class="wikitable">.
    squads = {}
    skipped_headings = []

    for h3 in soup.find_all("h3"):
        # Get the team name from the heading text (strip [edit] and whitespace)
        heading_text = h3.get_text(strip=True)
        # Remove trailing "edit" if present
        if heading_text.endswith("edit"):
            heading_text = heading_text[:-4].strip()
        # Also handle [edit] bracket
        heading_text = heading_text.replace("[edit]", "").strip()

        team_id = wiki_name_to_team_id.get(heading_text)
        if team_id is None:
            # Skip non-squad headings (e.g. "Group A", "Statistics", etc.)
            skipped_headings.append(heading_text)
            continue

        # Wikipedia wraps h3 in <div class="mw-heading">, so sibling walking
        # from the h3 itself finds nothing. Use find_next to walk forward in
        # document order and stop at the next table or heading.
        table = h3.find_next("table")
        # Make sure this table actually belongs to this heading and not the
        # next section — check that no other h2/h3 sits between them.
        if table is not None:
            next_h = h3.find_next(["h2", "h3"])
            if next_h is not None and next_h.sourceline is not None and table.sourceline is not None:
                if next_h.sourceline < table.sourceline:
                    table = None

        if table is None:
            print("  WARNING: no table found for %s (%s)" % (heading_text, team_id))
            continue

        players = parse_squad_table(table)
        if players:
            squads[team_id] = players
            print("  %s (%s): %d players" % (heading_text, team_id, len(players)))
        else:
            print("  WARNING: no players parsed for %s (%s)" % (heading_text, team_id))

    return squads


def parse_squad_table(table):
    """Extract players from a Wikipedia squad table.

    Columns: No., Pos., Player, Date of birth (age), Caps, Goals, Club
    The Player column has a link — we take the link text (cleaner than cell text).
    The Pos. column has a badge like "GK", "DF", "MF", "FW".
    """
    players = []
    rows = table.find_all("tr")

    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) < 3:
            continue

        # Skip header rows — the header row typically has "No." or "Pos." in cells
        first_cell_text = cells[0].get_text(strip=True).lower()
        if first_cell_text in ("no.", "no", "pos.", "pos", "player"):
            continue

        # Position is typically the 2nd column
        pos_cell = cells[1]
        pos_text = pos_cell.get_text(strip=True)
        # Extract the position abbreviation (GK, DF, MF, FW)
        position = None
        for abbr in ("GK", "DF", "MF", "FW"):
            if abbr in pos_text:
                position = pos_map.get(abbr)
                break

        if position is None:
            continue

        # Player name is the 3rd column — extract from the <a> link if present
        player_cell = cells[2]
        link = player_cell.find("a")
        if link:
            name = link.get_text(strip=True)
        else:
            name = player_cell.get_text(strip=True)

        # Clean up the name
        name = name.replace("(c)", "").replace("(C)", "").strip()
        # Remove any parenthetical notes
        if "(" in name:
            name = name[:name.index("(")].strip()

        if not name:
            continue

        players.append({"name": name, "position": position})

    return players


def run(dry_run):
    print("Fetching %s ..." % wiki_url)
    html = fetch_html(wiki_url)
    print("Parsing squads ...")
    squads = parse_squads(html)

    total = 0
    for team_id in squads:
        total += len(squads[team_id])

    print("\nTeams: %d  |  Total players: %d" % (len(squads), total))

    if dry_run:
        print("\n--- DRY RUN ---")
        for team_id in sorted(squads.keys()):
            print("\n%s (%d):" % (team_id, len(squads[team_id])))
            for p in squads[team_id][:5]:
                print("  %s (%s)" % (p["name"], p["position"]))
            if len(squads[team_id]) > 5:
                print("  ... and %d more" % (len(squads[team_id]) - 5))
        return

    os.makedirs(maps_dir, exist_ok=True)
    out_path = os.path.join(maps_dir, "tournament_squad.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(squads, f, indent=2, ensure_ascii=False)

    print("Wrote %s" % out_path)


def main():
    ap = argparse.ArgumentParser(description="Scrape 2026 WC squads from Wikipedia.")
    ap.add_argument("--dry-run", action="store_true", help="parse + print only; no file write")
    run(ap.parse_args().dry_run)


if __name__ == "__main__":
    main()
