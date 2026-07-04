import os
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.database import get_db
from app.queries.user import check_username_taken, get_email_by_username
from app.rate_limit import enforce_rate_limit
from app.schemas import LoginRequest

router = APIRouter()

username_regex = re.compile(r"^[a-zA-Z0-9_ ]{3,20}$")

supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")


@router.get("/check-username")
def check_username(username: str = Query(...), request: Request = None, conn=Depends(get_db)):
    enforce_rate_limit(request, "check-username", 60, 60)
    username = username.strip()
    if not username_regex.match(username):
        return {"available": False, "reason": "invalid"}
    taken = check_username_taken(conn, username)
    return {"available": not taken, "reason": "taken" if taken else "ok"}


@router.post("/auth/login")
def login(body: LoginRequest, request: Request = None, conn=Depends(get_db)):
    enforce_rate_limit(request, "auth-login", 10, 60)
    email = get_email_by_username(conn, body.username.strip())
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    try:
        resp = httpx.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={
                "apikey": supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"email": email, "password": body.password},
            timeout=10,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unavailable")

    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    data = resp.json()
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
    }
