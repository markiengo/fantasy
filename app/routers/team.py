from fastapi import APIRouter, Depends
from app.database import get_db
from app.queries.team import get_teams

router = APIRouter()

@router.get("/teams")
def get_teams_route(conn=Depends(get_db)):
    result = get_teams(conn)
    return result

