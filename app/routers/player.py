from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.queries.player import get_players, get_player

router = APIRouter()

@router.get("/players")
def get_players_route(
    conn=Depends(get_db),
    name: str = None,
    position: str = None,
    team_id: str = None,
    max_price: float = None
):
    result = get_players(conn, name, position, team_id, max_price)
    return result

@router.get("/players/{player_id}")
def get_player_route(player_id: int, conn=Depends(get_db)):
    result = get_player(conn, player_id)
    if not result: 
        raise HTTPException(status_code = 404, detail = "Player not found")
    return result 

