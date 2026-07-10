import json
import urllib.request
import urllib.error

base = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"

position_map = {"G": "GK", "D": "DEF", "M": "MID", "F": "FWD"}

stage_map = {
    "group-stage":    "group_stage",
    "round-of-32":    "round_of_32",
    "round-of-16":    "round_of_16",
    "quarterfinals":  "quarter_final",
    "semifinals":     "semi_final",
    "3rd-place-match": "final",   # schema has no 3rd-place stage
    "final":          "final",
}

full_match_minutes = 90


def _get(path):
    req = urllib.request.Request(base + path, headers={"User-Agent": "fantasy-wc/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:  # nosec - public read-only API
        return json.load(r)


def teams():
    data = _get("/teams")
    out = []
    for entry in data["sports"][0]["leagues"][0]["teams"]:
        t = entry["team"]
        out.append({"espn_id": t["id"], "team_id": t["abbreviation"], "name": t["displayName"]})
    return out


def roster(espn_team_id):
    data = _get("/teams/" + str(espn_team_id) + "/roster")
    out = []
    for a in data.get("athletes", []):
        pos_abbr = (a.get("position") or {}).get("abbreviation")
        position = position_map.get(pos_abbr)
        if position is None:
            continue
        out.append({"espn_id": a["id"], "name": a.get("displayName"), "position": position})
    return out


def scoreboard(yyyymmdd):
    data = _get("/scoreboard?dates=" + str(yyyymmdd))
    out = []
    for e in data.get("events", []):
        comp = e["competitions"][0]
        home = away = home_score = away_score = None
        home_penalty = away_penalty = None
        for c in comp["competitors"]:
            abbr = c["team"]["abbreviation"]
            raw = c.get("score")
            score = int(raw) if raw not in (None, "") else None
            shootout_raw = c.get("shootoutScore")
            penalty = int(shootout_raw) if shootout_raw not in (None, "") else None
            if c.get("homeAway") == "home":
                home, home_score, home_penalty = abbr, score, penalty
            else:
                away, away_score, away_penalty = abbr, score, penalty

        slug = (e.get("season") or {}).get("slug", "group-stage")
        completed = (comp.get("status") or {}).get("type", {}).get("completed", False)
        if not completed:
            home_score = away_score = None
            home_penalty = away_penalty = None

        out.append({
            "event_id": e["id"],
            "date": e["date"][:10],
            "date_raw": e["date"],
            "stage": stage_map.get(slug, "group_stage"),
            "stage_slug": slug,
            "home": home, "away": away,
            "home_score": home_score, "away_score": away_score,
            "home_penalty": home_penalty, "away_penalty": away_penalty,
            "completed": completed,
        })
    return out


def _substitution_minutes(key_events):
    # participants[0] = coming on, participants[1] = going off; clock.value in seconds
    subbed_on = {}
    subbed_off = {}
    for ev in key_events:
        if (ev.get("type") or {}).get("type") != "substitution":
            continue
        minute = round((ev.get("clock") or {}).get("value", 0) / 60)
        parts = ev.get("participants") or []
        if len(parts) >= 1 and parts[0].get("athlete"):
            subbed_on[parts[0]["athlete"]["id"]] = minute
        if len(parts) >= 2 and parts[1].get("athlete"):
            subbed_off[parts[1]["athlete"]["id"]] = minute
    return subbed_on, subbed_off


def _penalty_saves(key_events, rosters):
    """Parse penalty---saved keyEvents and return {espn_id: count} for GKs who saved."""
    team_id_to_abbr = {}
    for side in rosters:
        team = side.get("team") or {}
        team_id_to_abbr[team.get("id")] = team.get("abbreviation")

    gk_by_team = {}
    for side in rosters:
        team_abbr = (side.get("team") or {}).get("abbreviation")
        for entry in side.get("roster", []):
            if not entry.get("starter"):
                continue
            stats = {}
            for s in (entry.get("stats") or []):
                stats[s["name"]] = s.get("value", 0)
            if "saves" in stats:
                gk_by_team[team_abbr] = entry["athlete"]["id"]
                break

    saves = {}
    for ev in key_events:
        if (ev.get("type") or {}).get("type") != "penalty---saved":
            continue
        if ev.get("shootout"):
            continue
        attacking_team_id = (ev.get("team") or {}).get("id")
        attacking_abbr = team_id_to_abbr.get(attacking_team_id)
        defending_abbr = None
        for abbr in team_id_to_abbr.values():
            if abbr != attacking_abbr:
                defending_abbr = abbr
                break
        gk_id = gk_by_team.get(defending_abbr)
        if gk_id:
            saves[gk_id] = saves.get(gk_id, 0) + 1
    return saves


def match_player_stats(event_id):
    data = _get("/summary?event=" + str(event_id))
    subbed_on, subbed_off = _substitution_minutes(data.get("keyEvents", []))
    penalty_saves = _penalty_saves(data.get("keyEvents", []), data.get("rosters", []))

    out = []
    for side in data.get("rosters", []):
        team_abbr = (side.get("team") or {}).get("abbreviation")
        for entry in side.get("roster", []):
            aid = entry["athlete"]["id"]
            stats = {}
            for s in (entry.get("stats") or []):
                stats[s["name"]] = s.get("value", 0)

            appeared = (
                bool(entry.get("starter"))
                or aid in subbed_on
                or (stats.get("appearances", 0) or 0) >= 1
            )

            if entry.get("starter"):
                minutes = subbed_off.get(aid, full_match_minutes)
            elif aid in subbed_on:
                minutes = full_match_minutes - subbed_on[aid]
            elif appeared:
                minutes = full_match_minutes
            else:
                minutes = 0

            out.append({
                "espn_id": aid,
                "team": team_abbr,
                "goals":   int(stats.get("totalGoals", 0) or 0),
                "assists": int(stats.get("goalAssists", 0) or 0),
                "yellow":  int(stats.get("yellowCards", 0) or 0),
                "red":     int(stats.get("redCards", 0) or 0),
                "minutes": int(minutes),
                "appeared": appeared,
                "saves":             int(float(stats.get("saves", 0) or 0)),
                "own_goals":         int(float(stats.get("ownGoals", 0) or 0)),
                "shots_on_target":   int(float(stats.get("shotsOnTarget", 0) or 0)),
                "fouls_committed":   int(float(stats.get("foulsCommitted", 0) or 0)),
                "offsides":          int(float(stats.get("offsides", 0) or 0)),
                "goals_conceded":    int(float(stats.get("goalsConceded", 0) or 0)),
                "penalty_saves":     penalty_saves.get(aid, 0),
            })
    return out
