import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from psycopg2.errors import UniqueViolation

from app.auth import get_current_auth_payload
from app.database import get_db
from app.queries.user import get_user_by_auth_id, create_user_from_auth, check_username_taken
from app.rate_limit import enforce_rate_limit
from app.schemas import CompleteProfileRequest

router = APIRouter()

username_regex = re.compile(r"^[a-zA-Z0-9_ ]{3,20}$")


@router.get("/me")
def get_me_route(payload: dict = Depends(get_current_auth_payload), conn=Depends(get_db)):
    auth_user_id = payload["sub"]
    user = get_user_by_auth_id(conn, auth_user_id)

    if not user:
        user_metadata = payload.get("user_metadata") or {}
        username = (user_metadata.get("username") or "").strip()
        if username and username_regex.match(username):
            try:
                user = create_user_from_auth(conn, auth_user_id, username, username)
            except UniqueViolation:
                if hasattr(conn, "rollback"):
                    conn.rollback()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        else:
            return {
                "needs_username": True,
                "email": payload.get("email"),
                "name": user_metadata.get("full_name") or user_metadata.get("name"),
                "avatar_url": user_metadata.get("avatar_url"),
            }

    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "role": user["role"],
    }


@router.post("/complete-profile")
def complete_profile_route(body: CompleteProfileRequest, request: Request = None, payload: dict = Depends(get_current_auth_payload), conn=Depends(get_db)):
    enforce_rate_limit(request, "complete-profile", 20, 60)
    auth_user_id = payload["sub"]

    existing = get_user_by_auth_id(conn, auth_user_id)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already completed")

    username = body.username.strip()
    if not username_regex.match(username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be 3-20 chars: ASCII letters (A-Z), numbers, underscores, and spaces only. No accents or diacritics.")

    if check_username_taken(conn, username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    user_metadata = payload.get("user_metadata") or {}
    display_name = user_metadata.get("full_name") or user_metadata.get("name") or username

    user = create_user_from_auth(conn, auth_user_id, username, display_name)

    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "role": user["role"],
    }
