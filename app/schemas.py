# this is to validate data types coming from the API requests
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class User(BaseModel):
    user_id: int
    name: str
    created_at: datetime

class Transfers(BaseModel):
    transfer_id: int
    user_id: int
    player_in_id: int
    player_out_id: int
    matchday: int

class Squad(BaseModel):
    squad_id: int
    user_id: int
    matchday: int
    budget_used: float
    created_at: datetime

class SquadPlayer(BaseModel):
    squad_player_id: int
    squad_id: int
    player_id: int

class Player(BaseModel):
    player_id: int
    name: str
    position: str # in ("GK", "DEF", "MID", "FWD")
    team_id: str
    base_price: float

class PlayerStat(BaseModel):
    stat_id: int
    player_id: int
    match_id: int
    goals: int
    assists: int
    minutes_played: int
    yellow_cards: int
    red_cards: int
    clean_sheet: int
    score: float

class Team(BaseModel):
    team_id: str
    name: str
    fifa_ranking: int
    elo_rating: float
    group_stage: str # in ("A", "B", "C", "D", "E", "F", "G", "H")

class Match(BaseModel):
    match_id: int
    team1_id: str
    team2_id: str
    matchday: int
    stage: str # in ("group_stage", "round_of_16", "quarter_final", "semi_final", "final")
    date: date
    team1_score: Optional[int]
    team2_score: Optional[int]
    bracket_order: Optional[int] = None

class SquadCreate(BaseModel): 
    matchday: int
    player_ids: list[int]

class TransferCreate(BaseModel):
    player_in_id: int
    player_out_id: int
    matchday: int

class LoadStatsRequest(BaseModel):
    date: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    dry_run: bool = False




