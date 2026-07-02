from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user
from app.queries.leaderboard import get_leaderboard

router = APIRouter()


@router.get("/leaderboard")
def get_leaderboard_route(
    matchday: int = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    entries = get_leaderboard(conn, matchday=matchday)

    response = {
        "entries": entries,
        "my_user_id": current_user["user_id"],
    }
    if matchday is not None:
        response["matchday"] = matchday
    return response
