from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.auth import get_current_user
from app.queries.squad import get_squad
from app.queries.transfer import get_transfers
from app.queries.analytics import (
    get_squad_score,
    get_squad_score_composition,
    get_rank_history,
    get_player_breakdown,
    get_league_comparison,
    get_dashboard_score_data,
)

router = APIRouter()


def _build_squad(rows):
    if not rows:
        return None
    first = rows[0]
    players = []
    for row in rows:
        players.append({
            "player_id": row["player_id"],
            "name": row["player_name"],
            "position": row["position"],
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "base_price": row["base_price"],
            "is_captain": row["is_captain"],
        })
    return {
        "squad_id": first["squad_id"],
        "matchday": first["matchday"],
        "budget_used": first["budget_used"],
        "budget_remaining": first["budget_remaining"],
        "players": players,
    }

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

# Per-player raw stats + per-stat point breakdown for a matchday.
# Captain x2 applied per stat. Only non-zero stats included.
# If matchday is omitted, defaults to the user's latest squad matchday.
@router.get("/analytics/player-breakdown")
def get_player_breakdown_route(
    matchday: int = None,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = get_player_breakdown(conn, current_user["user_id"], matchday)
    return result

# Compares user's cumulative score vs league average at each matchday.
# Response: [{matchday, user_score, league_avg}]
@router.get("/analytics/league-comparison")
def get_league_comparison_route(
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = get_league_comparison(conn, current_user["user_id"])
    return {"comparison": result}

# One response for the dashboard's initial render. Historical composition and
# captain data are aggregated server-side so the browser does not fan out into
# a request per matchday.
@router.get("/analytics/dashboard")
def get_dashboard_route(
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    dashboard = get_dashboard_score_data(conn, user_id)
    latest_matchday = dashboard["latest_matchday"]

    selected_squad = None
    player_breakdown = {"matchday": None, "players": []}
    if latest_matchday is not None:
        selected_squad = _build_squad(get_squad(conn, user_id, latest_matchday))
        player_breakdown = get_player_breakdown(conn, user_id, latest_matchday)

    return {
        "by_matchday": dashboard["by_matchday"],
        "score_breakdowns": dashboard["score_breakdowns"],
        "compositions": dashboard["compositions"],
        "selected_matchday": latest_matchday,
        "selected_squad": selected_squad,
        "player_breakdown": player_breakdown,
        "league_comparison": get_league_comparison(conn, user_id),
        "transfers": get_transfers(conn, user_id),
    }
