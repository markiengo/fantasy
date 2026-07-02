from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.auth import get_current_user
from app.queries.analytics import (
    get_squad_score,
    get_squad_score_composition,
    get_rank_history,
)

router = APIRouter()

# Without ?matchday= → cumulative score grouped by matchday.
# With ?matchday=X   → per-player breakdown for that matchday (captain x2 applied).
@router.get("/analytics/squad-score")
def get_squad_score_route(
    matchday: int = None,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = get_squad_score(conn, current_user["user_id"], matchday=matchday)

    if not result:
        raise HTTPException(status_code=404, detail="Squad or Stats don't exist")

    if matchday is not None:
        breakdown = []
        for row in result:
            breakdown.append({
                "player_id": row["player_id"],
                "player_name": row["name"],
                "position": row["position"],
                "player_score": row["player_score"],
                "is_captain": row["is_captain"],
            })
        return {
            "matchday": matchday,
            "breakdown": breakdown,
        }
    else:
        by_matchday = []
        for row in result:
            by_matchday.append({
                "matchday": row["matchday"],
                "squad_score": row["squad_score"],
            })
        return {"by_matchday": by_matchday}

# Breaks down the squad's score for a matchday by stat type:
# goals, assists, clean sheets, minutes, cards. Captain x2 applied.
@router.get("/analytics/composition")
def get_composition_route(
    matchday: int = None,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if matchday is None:
        raise HTTPException(status_code=400, detail="matchday parameter is required")
    result = get_squad_score_composition(conn, current_user["user_id"], matchday)
    return result

# Returns the user's cumulative rank at each matchday where they have a squad.
# Response: [{matchday, rank, squad_score, total_managers}]
@router.get("/analytics/rank-history")
def get_rank_history_route(
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = get_rank_history(conn, current_user["user_id"])
    return {"rank_history": result}
