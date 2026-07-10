from collections import Counter
from decimal import Decimal

# Rule constants
budget_cap = Decimal("50") # GR-01, in $M
squad_size = 11 # GR-02
max_transfers = 5

# National team limit scales by tournament stage (GR-04)
# MD 1-4: Group Stage + R32 → 3
# MD 5:   Round of 16       → 4
# MD 6:   Quarter-finals     → 5
# MD 7:   Semi-finals        → 6
# MD 8:   Final              → 8
_nation_limit_by_md = {1: 3, 2: 3, 3: 3, 4: 3, 5: 4, 6: 5, 7: 6, 8: 8}


def nation_limit_for_matchday(matchday):
    return _nation_limit_by_md.get(matchday, 3)

# Allowed formations
valid_formations = {
    (1, 4, 3, 3), # 4-3-3
    (1, 4, 4, 2) # 4-4-2
}


class SquadValidationError(Exception):
    pass

# cases when creating a new squad

## section 1: squad rules
### 1. squad < 11 or > 11 players
def validate_squad_size(players):
    player_ids = []
    for p in players: 
        player_ids.append(p["player_id"])

    if len(player_ids) != squad_size:
        raise SquadValidationError(
            f"Squad must have exactly {squad_size} players, got {len(player_ids)}"
        )
    # squad has duplicating players
    if len(set(player_ids)) != len(player_ids):
        raise SquadValidationError("Duplicate player IDs in squad")

### 2. invalid formations
def validate_formation(players):
    positions = []
    for p in players:
        positions.append(p["position"])
    counts = Counter(positions)
    formation = (
        counts.get("GK", 0),
        counts.get("DEF", 0),
        counts.get("MID", 0),
        counts.get("FWD", 0)
    )
    if formation not in valid_formations:
        raise SquadValidationError(
            f"Invalid formation {formation}. Must be 4-3-3 or 4-4-2."
        )

### 3. GR-04: maximum N players per country (scales by matchday)
def validate_nation_limit(players, matchday=None):
    limit = nation_limit_for_matchday(matchday) if matchday else 3
    team_ids = []
    for p in players:
        team_ids.append(p["team_id"])
    counts = Counter(team_ids)
    for team_id, count in counts.items():
        if count > limit:
            raise SquadValidationError(
                f"Too many players from team {team_id}: {count} (max {limit})"
            )

### 4. check squad's value against budget cap
def validate_budget(players):
    total = Decimal("0")
    for p in players:
        total += p["base_price"]
    if total > budget_cap:
        raise SquadValidationError(
            f"Squad value {total}M exceeds budget cap ${budget_cap}M"
        )

### 5. wrap the squad's functions into one
def validate_squad(players, matchday=None):
    validate_squad_size(players)
    validate_formation(players)
    validate_nation_limit(players, matchday)
    validate_budget(players)

## Section 2: Transfer rules

### 1. GR-07: Lock transfers once the matchday's first match starts.
def validate_transfer_window(now_utc, first_kickoff_utc, override=False):
    if override:
        return
    from datetime import timedelta
    lock_time = first_kickoff_utc - timedelta(hours=1)
    if now_utc >= lock_time:
        raise SquadValidationError(
            f"Transfer window closed — locks 1 hour before kickoff ({lock_time.strftime('%Y-%m-%d %H:%M UTC')})"
        )

### 2. player_out must be in squad; post-swap squad must still pass validate_squad
def simulate_transfer(current_players, player_out_id, player_in):
    updated = []
    for p in current_players:
        if p["player_id"] != player_out_id:
            updated.append(p)
    if len(updated) == len(current_players):
        raise SquadValidationError(f"Player {player_out_id} is not in the current squad")
    updated.append(player_in)
    return updated
