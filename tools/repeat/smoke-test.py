import json
import urllib.request


BASE = "http://127.0.0.1:8000/api"


def get(path: str):
    with urllib.request.urlopen(BASE + path) as r:  # nosec - local dev only
        return json.load(r)


def post(path: str, obj: dict):
    data = json.dumps(obj).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:  # nosec - local dev only
            return json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"POST {path} failed: {e.code} {e.reason} body={raw}") from e


def build_valid_squad(players: list[dict], formation: str = "4-3-3") -> list[int]:
    if formation != "4-3-3":
        raise ValueError("Only 4-3-3 smoke test supported")

    need = {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3}
    bypos: dict[str, list[dict]] = {k: [] for k in need}
    for p in players:
        pos = p.get("position")
        if pos in bypos:
            bypos[pos].append(p)
    for k in bypos:
        bypos[k].sort(key=lambda x: x.get("base_price", 0), reverse=True)

    sel: list[dict] = []
    teamc: dict[str, int] = {}
    for pos in ["GK", "DEF", "MID", "FWD"]:
        for p in bypos[pos]:
            tid = p.get("team_id")
            if teamc.get(tid, 0) >= 3:
                continue
            sel.append(p)
            teamc[tid] = teamc.get(tid, 0) + 1
            if sum(1 for s in sel if s.get("position") == pos) >= need[pos]:
                break

    if len(sel) != 11:
        raise RuntimeError(
            "Selection failed: "
            + str({k: sum(1 for s in sel if s.get("position") == k) for k in need})
        )
    return [p["player_id"] for p in sel]


def main():
    players = get("/players")
    teams = get("/teams")
    matches = get("/matches")
    print("players", len(players), "teams", len(teams), "matches", len(matches))

    player_ids = build_valid_squad(players)
    for matchday in (1, 2, 3):
        try:
            saved = post("/squad", {"matchday": matchday, "player_ids": player_ids})
            print(
                "saved squad matchday",
                saved.get("matchday"),
                "players",
                len(saved.get("players", [])),
            )
            fetched = get(f"/squad?matchday={matchday}")
            print(
                "fetched squad matchday",
                fetched.get("matchday"),
                "players",
                len(fetched.get("players", [])),
            )
            break
        except RuntimeError as e:
            msg = str(e)
            if "Squad already exists for this matchday" in msg:
                print(f"matchday {matchday} already has a squad; trying next")
                continue
            raise


if __name__ == "__main__":
    main()

