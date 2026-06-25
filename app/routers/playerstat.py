from fastapi import APIRouter, Depends
from app.database import get_db
from app.queries.playerstat import get_playerstats, get_top_stats

router = APIRouter()

@router.get("/playerstats")
def get_playerstats_route(conn = Depends(get_db), match_id: int = None, player_id: int = None):
    result = get_playerstats(conn, match_id, player_id)
    return result

@router.get("/playerstats/top")
def get_top_stats_route(conn = Depends(get_db), limit: int = 5):
    result = get_top_stats(conn, limit)
    return result
