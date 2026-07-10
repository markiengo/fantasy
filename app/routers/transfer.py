from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth import get_current_user
from app.queries.transfer import get_transfers, post_transfer, count_transfers
from app.queries.player import get_player
from app.queries.squad import get_effective_squad
from app.queries.match import get_matchday_start
from app.schemas import TransferCreate
from app.core.validation import validate_transfer_window, simulate_transfer, validate_squad, budget_cap, max_transfers

router = APIRouter()

@router.get("/transfers")
def get_transfers_route(
    conn = Depends(get_db),
    matchday: int = None,
    current_user = Depends(get_current_user),
):
    result = get_transfers(conn, current_user["user_id"], matchday)
    return result

@router.post("/transfer", status_code = 201)
def post_transfer_route(
    body: TransferCreate,
    conn = Depends(get_db),
    current_user = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    player_in = get_player(conn, body.player_in_id)
    if not player_in:
        raise HTTPException(status_code=404, detail=f"Player {body.player_in_id} not found")
    player_out = get_player(conn, body.player_out_id)
    if not player_out:
        raise HTTPException(status_code=404, detail=f"Player {body.player_out_id} not found")

    first_kickoff = get_matchday_start(conn, body.matchday)
    if first_kickoff is not None:
        now_utc = datetime.now(timezone.utc)
        validate_transfer_window(now_utc, first_kickoff, override=current_user.get("transfer_override", False))

    transfers_used = count_transfers(conn, user_id, body.matchday)
    transfers_remaining = max_transfers - transfers_used
    if transfers_remaining <= 0:
        raise HTTPException(status_code=400, detail="Maximum transfers allowed")

    squad_rows = get_effective_squad(conn, user_id, body.matchday)
    if not squad_rows:
        raise HTTPException(status_code=404, detail="No squad found. Create a squad first.")

    new_squad = simulate_transfer(list(squad_rows), body.player_out_id, dict(player_in))
    validate_squad(new_squad, body.matchday)

    transfer_id, new_budget = post_transfer(conn, user_id, body.player_in_id, body.player_out_id, body.matchday, first_kickoff)
    result = {
        "transfer_id": transfer_id,
        "player_in_id": body.player_in_id,
        "player_in_name": player_in["name"],
        "player_out_id": body.player_out_id,
        "player_out_name": player_out["name"],
        "matchday": body.matchday,
        "transfers_used": transfers_used + 1,
        "transfers_remaining": transfers_remaining - 1,
        "budget_remaining": budget_cap - new_budget
    }

    return result
