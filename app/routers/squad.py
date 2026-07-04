from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth import get_current_user
from app.queries.squad import get_squad, get_effective_squad, create_squad
from app.queries.player import get_player
from app.queries.match import get_matchday_start
from app.schemas import SquadCreate
from app.core.validation import validate_squad, SquadValidationError
from datetime import datetime, timezone

router = APIRouter()


def build_squad(rows):
    # get_squad returns one row per player; collapse into a single squad object
    first = rows[0]
    players = []
    for r in rows:
        players.append({
            "player_id": r["player_id"],
            "name": r["player_name"],
            "position": r["position"],
            "team_id": r["team_id"],
            "team_name": r["team_name"],
            "base_price": r["base_price"],
            "is_captain": r["is_captain"],
        })
    return {
        "squad_id": first["squad_id"],
        "matchday": first["matchday"],
        "budget_used": first["budget_used"],
        "budget_remaining": first["budget_remaining"],
        "players": players,
    }


@router.get("/squad")
def get_squad_route(
    matchday: int,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    rows = get_effective_squad(conn, current_user["user_id"], matchday)
    if not rows:
        raise HTTPException(status_code=404, detail="No squad found.")
    return build_squad(rows)



@router.post("/squad", status_code = 201)
def post_squad_route(
    body: SquadCreate,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    players = []
    for player_id in body.player_ids:
        player = get_player(conn, player_id)
        if not player:
            raise HTTPException(status_code = 404, detail = f"Player {player_id} not found")
        players.append(player)

    validate_squad(players, body.matchday)

    if body.captain_player_id is None:
        raise HTTPException(status_code=400, detail="Captain is required")
    if body.captain_player_id not in body.player_ids:
        raise HTTPException(status_code=400, detail="Captain must be in the squad")

    budget_used = sum(p["base_price"] for p in players)

    first_kickoff = get_matchday_start(conn, body.matchday)
    time_left = 0
    if first_kickoff is not None:
        now_utc = datetime.now(timezone.utc)
        diff_seconds = (first_kickoff - now_utc).total_seconds()
        time_left = max(diff_seconds / 3600, 0)

    create_squad(conn, user_id, body.matchday, budget_used, body.player_ids, body.captain_player_id, time_left)

    return build_squad(get_squad(conn, user_id, body.matchday))
