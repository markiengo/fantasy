from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.auth import get_current_user
from app.permissions import require_admin
from app.schemas import LoadStatsRequest
from app.services.stat_loader import load_stats


router = APIRouter()


@router.post("/load-stats")
def load_stats_route(
    body: LoadStatsRequest | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_admin(current_user)
    if body is None:
        body = LoadStatsRequest()
    try:
        return load_stats(
            conn,
            date_value=body.date,
            from_date=body.from_date,
            to_date=body.to_date,
            dry_run=body.dry_run,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to load stats: " + str(exc))
