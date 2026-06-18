from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.queries.match import get_matches, get_match, get_match_stats

router = APIRouter()

@router.get("/matches")
def get_matches_route(conn=Depends(get_db), matchday: int = None, stage: str = None):
    result = get_matches(conn, matchday=matchday, stage=stage)
    return result

@router.get("/matches/{match_id}")
def get_match_route(match_id: int, conn=Depends(get_db)):
    result = get_match(conn, match_id)
    if not result:
        raise HTTPException(status_code=404, detail="Match not found")
    return {**result, "stats": get_match_stats(conn, match_id)}