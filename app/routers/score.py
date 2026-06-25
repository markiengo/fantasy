from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth import get_current_user
from app.queries.score import get_score

router = APIRouter()

@router.get("/score")
def get_score_route(
    matchday: int = None,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = get_score(conn, current_user["user_id"], matchday=matchday)

    if not result:
        raise HTTPException(status_code=404, detail="Squad or Stats don't exist")
    if matchday is not None:
        breakdown = []
        for row in result:
            breakdown.append({
                "player_id": row["player_id"],
                "player_name": row["name"],
                "position": row["position"],
                "score": row["score"],
            })
        return {
            "matchday": matchday,
            "breakdown": breakdown,
        }
    else:
        by_matchday = []
        for row in result:
            by_matchday.append({"matchday": row["matchday"], "score": row["squad_score"]})
        return {"by_matchday": by_matchday}








