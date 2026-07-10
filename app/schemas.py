from pydantic import BaseModel
from typing import Optional

class SquadCreate(BaseModel): 
    matchday: int
    player_ids: list[int]
    captain_player_id: Optional[int] = None

class TransferCreate(BaseModel):
    player_in_id: int
    player_out_id: int
    matchday: int

class LoadStatsRequest(BaseModel):
    date: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    dry_run: bool = False

class LoginRequest(BaseModel):
    username: str
    password: str

class CompleteProfileRequest(BaseModel):
    display_name: str

class UpdateDisplayNameRequest(BaseModel):
    display_name: str


