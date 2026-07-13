from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user
from app.queries.leaderboard import get_leaderboard, get_leaderboard_matchdays, get_popular_players

router = APIRouter()


@router.get("/leaderboard")
def get_leaderboard_route(
    matchday: int = None,
    cumulative: bool = True,
    include_meta: bool = True,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    entries = get_leaderboard(conn, matchday=matchday, cumulative=cumulative)
    response = {
        "entries": entries,
        "my_user_id": current_user["user_id"],
    }
    if include_meta:
        response["available_matchdays"] = get_leaderboard_matchdays(conn)
        response["popular_players"] = get_popular_players(conn, matchday=matchday)
    if matchday is not None:
        response["matchday"] = matchday
    return response
