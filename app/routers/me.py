import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Request, status
from psycopg2.errors import UniqueViolation

from app.auth import get_current_auth_payload
from app.database import get_db
from app.queries.user import get_user_by_auth_id, create_user_from_auth, check_username_taken, update_display_name, get_user_account_info
from app.rate_limit import enforce_rate_limit
from app.schemas import CompleteProfileRequest, UpdateDisplayNameRequest

router = APIRouter()


def _slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-zA-Z0-9_ ]", "", text)
    text = text.strip().replace(" ", "_")
    if len(text) < 3:
        text = (text + "user")[:5]
    return text[:20].lower()


def _generate_unique_username(conn, base):
    username = base
    suffix = 1
    while check_username_taken(conn, username):
        suffix_str = str(suffix)
        max_base = 20 - len(suffix_str)
        username = base[:max_base] + suffix_str
        suffix += 1
    return username


@router.get("/me")
def get_me_route(payload: dict = Depends(get_current_auth_payload), conn=Depends(get_db)):
    auth_user_id = payload["sub"]
    user = get_user_by_auth_id(conn, auth_user_id)

    if not user:
        user_metadata = payload.get("user_metadata") or {}
        display_name = (user_metadata.get("display_name") or user_metadata.get("full_name") or user_metadata.get("name") or "").strip()
        if display_name and len(display_name) >= 2:
            username = _generate_unique_username(conn, _slugify(display_name))
            try:
                user = create_user_from_auth(conn, auth_user_id, username, display_name)
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
        "transfer_override": user.get("transfer_override", False),
    }


@router.patch("/me")
def update_me_route(body: UpdateDisplayNameRequest, request: Request = None, payload: dict = Depends(get_current_auth_payload), conn=Depends(get_db)):
    enforce_rate_limit(request, "update-me", 10, 60)
    auth_user_id = payload["sub"]
    user = get_user_by_auth_id(conn, auth_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    display_name = body.display_name.strip()
    if len(display_name) < 2 or len(display_name) > 30:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Display name must be 2-30 characters.")

    updated = update_display_name(conn, user["user_id"], display_name)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "user_id": updated["user_id"],
        "username": updated["username"],
        "display_name": updated["display_name"],
        "role": updated["role"],
    }


@router.get("/me/account")
def get_account_route(payload: dict = Depends(get_current_auth_payload), conn=Depends(get_db)):
    auth_user_id = payload["sub"]
    user = get_user_by_auth_id(conn, auth_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    info = get_user_account_info(conn, user["user_id"])
    if not info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "user_id": info["user_id"],
        "username": info["username"],
        "display_name": info["display_name"],
        "role": info["role"],
        "email": info["email"],
    }


@router.post("/complete-profile")
def complete_profile_route(body: CompleteProfileRequest, request: Request = None, payload: dict = Depends(get_current_auth_payload), conn=Depends(get_db)):
    enforce_rate_limit(request, "complete-profile", 20, 60)
    auth_user_id = payload["sub"]

    existing = get_user_by_auth_id(conn, auth_user_id)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already completed")

    display_name = body.display_name.strip()
    if len(display_name) < 2 or len(display_name) > 30:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Display name must be 2-30 characters.")

    username = _generate_unique_username(conn, _slugify(display_name))

    user = create_user_from_auth(conn, auth_user_id, username, display_name)

    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "role": user["role"],
    }
