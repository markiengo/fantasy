from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user
from app.queries.leaderboard import get_leaderboard, get_leaderboard_matchdays, get_popular_players

router = APIRouter()


@router.get("/leaderboard")
def get_leaderboard_route(
    matchday: int = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    entries = get_leaderboard(conn, matchday=matchday)
    available_matchdays = get_leaderboard_matchdays(conn)
    popular_players = get_popular_players(conn, matchday=matchday)

    response = {
        "entries": entries,
        "my_user_id": current_user["user_id"],
        "available_matchdays": available_matchdays,
        "popular_players": popular_players,
    }
    if matchday is not None:
        response["matchday"] = matchday
    return response
