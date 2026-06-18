from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.queries.playerstat import get_playerstats, post_playerstats
from app.queries.player import get_player
from app.queries.match import get_match
from app.schemas import PlayerStatCreate, PlayerStatCreateBulk
import psycopg2

router = APIRouter()

@router.get("/playerstats")
def get_playerstats_route(conn = Depends(get_db), match_id: int = None, player_id: int = None):
    result = get_playerstats(conn, match_id, player_id)
    return result 

@router.post("/playerstats", status_code = 201)
def post_playerstats_route(body: PlayerStatCreate, conn = Depends(get_db)):

    # check to see if player and match exists
    player = get_player(conn, body.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    match = get_match(conn, body.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # check player's team played in this match
    if player["team_id"] not in (match["team1_id"], match["team2_id"]):
        raise HTTPException(status_code=400, detail="Player's team did not play in this match")

    try:
        stat_id, score = post_playerstats(conn, body.player_id, body.match_id, body.goals, body.assists, body.minutes_played, body.yellow_cards, body.red_cards, body.clean_sheet)
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Stat already exists for this player and match")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create player stat: {e}")

    result = {
        "stat_id": stat_id,
        "player_id": body.player_id,
        "match_id": body.match_id,
        "goals": body.goals,
        "assists": body.assists,
        "minutes_played": body.minutes_played,
        "yellow_cards": body.yellow_cards,
        "red_cards": body.red_cards,
        "clean_sheet": body.clean_sheet,
        "score": score
    }

    return result

@router.post("/playerstats/bulk", status_code = 201)
def post_playerstats_bulk_route(body: PlayerStatCreateBulk, conn = Depends(get_db)):
    """
    Bulk insert player stats. Machine-level endpoint for scripts only.
    Bypasses individual validation for performance, but still validates player/match existence.
    """
    results = []
    errors = []
    
    for stat in body.stats:
        try:
            # check to see if player and match exists
            player = get_player(conn, stat.player_id)
            if not player:
                errors.append({"player_id": stat.player_id, "match_id": stat.match_id, "error": "Player not found"})
                continue
            
            match = get_match(conn, stat.match_id)
            if not match:
                errors.append({"player_id": stat.player_id, "match_id": stat.match_id, "error": "Match not found"})
                continue

            # check player's team played in this match
            if player["team_id"] not in (match["team1_id"], match["team2_id"]):
                errors.append({"player_id": stat.player_id, "match_id": stat.match_id, "error": "Player's team did not play in this match"})
                continue

            stat_id, score = post_playerstats(conn, stat.player_id, stat.match_id, stat.goals, stat.assists, stat.minutes_played, stat.yellow_cards, stat.red_cards, stat.clean_sheet)
            results.append({
                "stat_id": stat_id,
                "player_id": stat.player_id,
                "match_id": stat.match_id,
                "goals": stat.goals,
                "assists": stat.assists,
                "minutes_played": stat.minutes_played,
                "yellow_cards": stat.yellow_cards,
                "red_cards": stat.red_cards,
                "clean_sheet": stat.clean_sheet,
                "score": score
            })
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            errors.append({"player_id": stat.player_id, "match_id": stat.match_id, "error": "Stat already exists for this player and match"})
        except Exception as e:
            conn.rollback()
            errors.append({"player_id": stat.player_id, "match_id": stat.match_id, "error": str(e)})
    
    return {
        "inserted": len(results),
        "errors": len(errors),
        "results": results,
        "errors_detail": errors
    }

