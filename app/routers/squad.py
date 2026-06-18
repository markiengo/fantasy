from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.queries.squad import get_squad, get_effective_squad, create_squad
from app.queries.player import get_player
from app.schemas import SquadCreate
from app.core.validation import validate_squad, SquadValidationError
import psycopg2

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
        })
    return {
        "squad_id": first["squad_id"],
        "matchday": first["matchday"],
        "budget_used": first["budget_used"],
        "budget_remaining": first["budget_remaining"],
        "players": players,
    }


@router.get("/squad")
def get_squad_route(matchday: int, conn = Depends(get_db)):
    user_id = 1
    rows = get_effective_squad(conn, user_id, matchday)
    if not rows:
        raise HTTPException(status_code=404, detail="No squad found.")
    return build_squad(rows)



@router.post("/squad", status_code = 201)
def post_squad_route(body: SquadCreate, conn = Depends(get_db)):
    user_id = 1
    players = []
    for player_id in body.player_ids:
        player = get_player(conn, player_id)
        if not player:
            raise HTTPException(status_code = 404, detail = f"Player {player_id} not found")
        players.append(player)

    validate_squad(players)

    budget_used = sum(p["base_price"] for p in players)

    try:
        create_squad(conn, user_id, body.matchday, budget_used, body.player_ids)
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code = 400, detail = "Squad already exists for this matchday")

    return build_squad(get_squad(conn, body.matchday))
